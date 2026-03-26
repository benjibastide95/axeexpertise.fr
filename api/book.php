<?php
/**
 * API Reservation — AXE Expertise
 *
 * POST /api/book.php
 * Body JSON: { service, datetime, employee, name, email, phone, message, mode }
 *
 * Cree un evenement dans le calendrier Outlook du collaborateur
 * et envoie un email de confirmation.
 */

header('Content-Type: application/json; charset=utf-8');

// CORS
require_once __DIR__ . '/config.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = json_decode(ALLOWED_ORIGINS, true) ?: [];
if (in_array($origin, $allowed)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Methode non autorisee']);
    exit;
}

require_once __DIR__ . '/ms-graph.php';

try {
    // Lire le body JSON
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        http_response_code(400);
        echo json_encode(['error' => 'Donnees invalides']);
        exit;
    }

    // Valider les champs requis
    $required = ['service', 'datetime', 'employee', 'name', 'email', 'phone'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            http_response_code(400);
            echo json_encode(['error' => "Champ requis manquant: {$field}"]);
            exit;
        }
    }

    $service   = htmlspecialchars($input['service'], ENT_QUOTES, 'UTF-8');
    $datetime  = $input['datetime'];
    $employee  = $input['employee'];
    $name      = htmlspecialchars($input['name'], ENT_QUOTES, 'UTF-8');
    $email     = filter_var($input['email'], FILTER_VALIDATE_EMAIL);
    $phone     = htmlspecialchars($input['phone'], ENT_QUOTES, 'UTF-8');
    $message   = htmlspecialchars($input['message'] ?? '', ENT_QUOTES, 'UTF-8');
    $mode      = $input['mode'] ?? 'cabinet';

    if (!$email) {
        http_response_code(400);
        echo json_encode(['error' => 'Email invalide']);
        exit;
    }

    // Verifier que l'employe appartient bien au service
    $serviceEmployees = json_decode(SERVICE_EMPLOYEES, true);
    if (!isset($serviceEmployees[$service]) || !in_array($employee, $serviceEmployees[$service])) {
        http_response_code(400);
        echo json_encode(['error' => 'Employe non associe a ce service']);
        exit;
    }

    // Verifier que le creneau n'est pas dans le passe
    $slotTime = new DateTime($datetime, new DateTimeZone(RDV_TIMEZONE));
    $now = new DateTime('now', new DateTimeZone(RDV_TIMEZONE));

    if ($slotTime <= $now) {
        http_response_code(400);
        echo json_encode(['error' => 'Ce creneau est deja passe']);
        exit;
    }

    // Verification de double-booking : verifier si le creneau est toujours libre
    $slotEnd = clone $slotTime;
    $slotEnd->modify('+' . RDV_DURATION_MINUTES . ' minutes');

    $startISO = $slotTime->format('Y-m-d\TH:i:s');
    $endISO = $slotEnd->format('Y-m-d\TH:i:s');

    $schedule = MicrosoftGraph::getSchedule(
        [$employee],
        $startISO,
        $endISO
    );

    // Verifier si l'employe est encore disponible
    if (isset($schedule['value'][0]['scheduleItems'])) {
        foreach ($schedule['value'][0]['scheduleItems'] as $item) {
            $status = $item['status'] ?? 'busy';
            if ($status !== 'free') {
                http_response_code(409);
                echo json_encode([
                    'error' => 'Ce creneau vient d\'etre reserve. Veuillez en choisir un autre.',
                    'code'  => 'SLOT_TAKEN',
                ]);
                exit;
            }
        }
    }

    // Preparer la description de l'evenement
    $locationText = $mode === 'visio'
        ? 'Visioconference (lien a envoyer)'
        : 'Cabinet AXE Expertise & Associes, Paris';

    $description = "Rendez-vous {$service}\n\n"
        . "Client : {$name}\n"
        . "Email : {$email}\n"
        . "Telephone : {$phone}\n"
        . "Mode : " . ($mode === 'visio' ? 'Visioconference' : 'En cabinet') . "\n";

    if ($message) {
        $description .= "\nMessage du client :\n{$message}\n";
    }

    // Formater les heures pour le titre
    $heureDebut = $slotTime->format('H:i');
    $heureFin = $slotEnd->format('H:i');
    $dateFormatee = $slotTime->format('d/m/Y');

    // Creer l'evenement dans le calendrier Outlook
    $eventData = [
        'subject' => "RDV {$service} — {$name}",
        'body' => [
            'contentType' => 'text',
            'content'     => $description,
        ],
        'start' => [
            'dateTime' => $startISO,
            'timeZone' => RDV_TIMEZONE,
        ],
        'end' => [
            'dateTime' => $endISO,
            'timeZone' => RDV_TIMEZONE,
        ],
        'location' => [
            'displayName' => $locationText,
        ],
        'attendees' => [
            [
                'emailAddress' => [
                    'address' => $email,
                    'name'    => $name,
                ],
                'type' => 'required',
            ],
        ],
        'isReminderOn' => true,
        'reminderMinutesBeforeStart' => 30,
    ];

    // Si visio, ajouter Teams meeting
    if ($mode === 'visio') {
        $eventData['isOnlineMeeting'] = true;
        $eventData['onlineMeetingProvider'] = 'teamsForBusiness';
    }

    $event = MicrosoftGraph::createEvent($employee, $eventData);

    if (!isset($event['id'])) {
        throw new Exception('Erreur lors de la creation de l\'evenement: ' . json_encode($event));
    }

    // Envoyer un email de notification au cabinet
    $notifSubject = "Nouveau RDV {$service} — {$name} le {$dateFormatee} a {$heureDebut}";
    $notifBody = "Nouveau rendez-vous reserve via le site web.\n\n"
        . "Service : {$service}\n"
        . "Date : {$dateFormatee} de {$heureDebut} a {$heureFin}\n"
        . "Client : {$name}\n"
        . "Email : {$email}\n"
        . "Telephone : {$phone}\n"
        . "Mode : " . ($mode === 'visio' ? 'Visioconference' : 'En cabinet') . "\n";

    if ($message) {
        $notifBody .= "Message : {$message}\n";
    }

    @mail(NOTIFICATION_EMAIL, $notifSubject, $notifBody, "From: noreply@axe-expertise.fr\r\nReply-To: {$email}");

    // Reponse de succes
    echo json_encode([
        'success'  => true,
        'message'  => 'Rendez-vous confirme',
        'booking'  => [
            'service'  => $service,
            'date'     => $dateFormatee,
            'time'     => "{$heureDebut} - {$heureFin}",
            'mode'     => $mode === 'visio' ? 'Visioconference' : 'En cabinet',
            'eventId'  => $event['id'],
        ],
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error'   => 'Erreur lors de la reservation',
        'details' => $e->getMessage(),
    ]);
}
