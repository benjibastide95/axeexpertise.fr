<?php
/**
 * API Disponibilites — AXE Expertise
 *
 * GET /api/availability.php?service=Juridique&week=2026-03-30
 *
 * Retourne les creneaux disponibles pour un service donne sur une semaine.
 * Interroge les calendriers Outlook 365 des salaries affectes au service.
 */

header('Content-Type: application/json; charset=utf-8');

// CORS
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = json_decode(ALLOWED_ORIGINS ?? '[]', true) ?: [];
if (in_array($origin, $allowed ?: [])) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/ms-graph.php';

try {
    // Parametres
    $service = $_GET['service'] ?? '';
    $weekStart = $_GET['week'] ?? '';

    if (!$service || !$weekStart) {
        http_response_code(400);
        echo json_encode(['error' => 'Parametres manquants: service et week requis']);
        exit;
    }

    // Recuperer les employes du service
    $serviceEmployees = json_decode(SERVICE_EMPLOYEES, true);
    if (!isset($serviceEmployees[$service])) {
        http_response_code(400);
        echo json_encode(['error' => 'Service inconnu: ' . $service]);
        exit;
    }

    $employees = $serviceEmployees[$service];

    // Calculer la plage de dates (semaine du lundi au vendredi)
    $monday = new DateTime($weekStart);
    // S'assurer qu'on est sur un lundi
    if ($monday->format('N') != 1) {
        $monday->modify('last monday');
    }

    $friday = clone $monday;
    $friday->modify('+4 days');
    $friday->setTime(RDV_END_HOUR, 0, 0);

    $startISO = $monday->format('Y-m-d\TH:i:s');
    $endISO = $friday->format('Y-m-d\T') . RDV_END_HOUR . ':00:00';

    // Empecher les reservations dans le passe
    $now = new DateTime('now', new DateTimeZone(RDV_TIMEZONE));

    // Appeler Microsoft Graph pour obtenir les disponibilites
    $scheduleData = MicrosoftGraph::getSchedule($employees, $startISO, $endISO);

    // Parser les reponses — construire une map de creneaux occupes par employe
    $busySlots = []; // email => [ [start, end], ... ]

    if (isset($scheduleData['value'])) {
        foreach ($scheduleData['value'] as $schedule) {
            $email = $schedule['scheduleId'] ?? '';
            $busySlots[$email] = [];

            if (isset($schedule['scheduleItems'])) {
                foreach ($schedule['scheduleItems'] as $item) {
                    $status = $item['status'] ?? 'busy';
                    if ($status === 'free') continue;

                    $busySlots[$email][] = [
                        'start' => new DateTime($item['start']['dateTime']),
                        'end'   => new DateTime($item['end']['dateTime']),
                    ];
                }
            }

            // Aussi parser le availabilityView (chaine binaire) si present
            if (isset($schedule['availabilityView'])) {
                $view = $schedule['availabilityView'];
                $slotStart = clone $monday;
                $slotStart->setTime(0, 0, 0);

                for ($i = 0; $i < strlen($view); $i++) {
                    if ($view[$i] !== '0') { // 0 = free, 1 = tentative, 2 = busy, 3 = OOF
                        $slotBegin = clone $slotStart;
                        $slotBegin->modify('+' . ($i * RDV_DURATION_MINUTES) . ' minutes');
                        $slotEnd = clone $slotBegin;
                        $slotEnd->modify('+' . RDV_DURATION_MINUTES . ' minutes');

                        $busySlots[$email][] = [
                            'start' => $slotBegin,
                            'end'   => $slotEnd,
                        ];
                    }
                }
            }
        }
    }

    // Generer tous les creneaux possibles pour la semaine
    $availableSlots = [];
    $duration = RDV_DURATION_MINUTES;

    for ($day = 0; $day < 5; $day++) {
        $date = clone $monday;
        $date->modify("+{$day} days");
        $dateStr = $date->format('Y-m-d');
        $dayName = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'][$day];

        for ($hour = RDV_START_HOUR; $hour < RDV_END_HOUR; $hour++) {
            // Sauter la pause dejeuner
            if ($hour >= RDV_LUNCH_START && $hour < RDV_LUNCH_END) {
                continue;
            }

            $slotStart = clone $date;
            $slotStart->setTime($hour, 0, 0);
            $slotEnd = clone $slotStart;
            $slotEnd->modify("+{$duration} minutes");

            // Ne pas proposer les creneaux passes
            if ($slotStart <= $now) {
                continue;
            }

            // Verifier si au moins un employe est disponible
            $availableEmployee = null;
            foreach ($employees as $email) {
                $isBusy = false;
                $employeeBusy = $busySlots[$email] ?? [];

                foreach ($employeeBusy as $busy) {
                    // Chevauchement ?
                    if ($slotStart < $busy['end'] && $slotEnd > $busy['start']) {
                        $isBusy = true;
                        break;
                    }
                }

                if (!$isBusy) {
                    $availableEmployee = $email;
                    break;
                }
            }

            if ($availableEmployee) {
                $availableSlots[] = [
                    'date'     => $dateStr,
                    'day'      => $dayName,
                    'time'     => sprintf('%02d:00', $hour),
                    'datetime' => $slotStart->format('Y-m-d\TH:i:s'),
                    'employee' => $availableEmployee,
                ];
            }
        }
    }

    // Retourner les creneaux
    echo json_encode([
        'service'   => $service,
        'weekStart' => $monday->format('Y-m-d'),
        'weekEnd'   => $friday->format('Y-m-d'),
        'slots'     => $availableSlots,
        'count'     => count($availableSlots),
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error'   => 'Erreur lors de la recuperation des disponibilites',
        'details' => $e->getMessage(),
    ]);
}
