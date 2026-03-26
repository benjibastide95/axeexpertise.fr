<?php
/**
 * Microsoft Graph API Helper — AXE Expertise
 * Gere l'authentification OAuth2 et les appels a l'API Microsoft Graph.
 */

require_once __DIR__ . '/config.php';

class MicrosoftGraph {

    private static $tokenCache = null;
    private static $tokenExpiry = 0;

    /**
     * Obtenir un token d'acces via OAuth2 Client Credentials
     */
    public static function getAccessToken(): string {
        // Utiliser le cache si le token est encore valide
        if (self::$tokenCache && time() < self::$tokenExpiry - 60) {
            return self::$tokenCache;
        }

        // Verifier le cache fichier
        $cacheFile = sys_get_temp_dir() . '/axe_ms_token.json';
        if (file_exists($cacheFile)) {
            $cached = json_decode(file_get_contents($cacheFile), true);
            if ($cached && time() < ($cached['expires_at'] ?? 0) - 60) {
                self::$tokenCache = $cached['access_token'];
                self::$tokenExpiry = $cached['expires_at'];
                return self::$tokenCache;
            }
        }

        $url = 'https://login.microsoftonline.com/' . MICROSOFT_TENANT_ID . '/oauth2/v2.0/token';

        $response = self::httpPost($url, [
            'grant_type'    => 'client_credentials',
            'client_id'     => MICROSOFT_CLIENT_ID,
            'client_secret' => MICROSOFT_CLIENT_SECRET,
            'scope'         => 'https://graph.microsoft.com/.default',
        ], false);

        if (!isset($response['access_token'])) {
            throw new Exception('Echec authentification Microsoft: ' . json_encode($response));
        }

        self::$tokenCache = $response['access_token'];
        self::$tokenExpiry = time() + ($response['expires_in'] ?? 3600);

        // Sauvegarder en cache fichier
        file_put_contents($cacheFile, json_encode([
            'access_token' => self::$tokenCache,
            'expires_at'   => self::$tokenExpiry,
        ]));

        return self::$tokenCache;
    }

    /**
     * Recuperer les evenements de calendrier d'un utilisateur sur une periode donnee
     */
    public static function getCalendarEvents(string $userEmail, string $startDate, string $endDate): array {
        $token = self::getAccessToken();

        $start = urlencode($startDate);
        $end = urlencode($endDate);

        $url = "https://graph.microsoft.com/v1.0/users/{$userEmail}/calendarView"
             . "?startDateTime={$start}&endDateTime={$end}"
             . '&$select=subject,start,end,showAs,isCancelled'
             . '&$orderby=start/dateTime'
             . '&$top=100';

        return self::httpGet($url, $token);
    }

    /**
     * Utiliser l'endpoint "getSchedule" pour obtenir les disponibilites de plusieurs utilisateurs
     * C'est plus efficace que d'interroger chaque calendrier individuellement
     */
    public static function getSchedule(array $emails, string $startDate, string $endDate): array {
        $token = self::getAccessToken();

        $url = 'https://graph.microsoft.com/v1.0/users/' . $emails[0] . '/calendar/getSchedule';

        $body = [
            'schedules'          => $emails,
            'startTime'          => [
                'dateTime' => $startDate,
                'timeZone' => RDV_TIMEZONE,
            ],
            'endTime'            => [
                'dateTime' => $endDate,
                'timeZone' => RDV_TIMEZONE,
            ],
            'availabilityViewInterval' => RDV_DURATION_MINUTES,
        ];

        return self::httpPostJson(
            $url,
            $body,
            $token
        );
    }

    /**
     * Creer un evenement dans le calendrier d'un utilisateur
     */
    public static function createEvent(string $userEmail, array $eventData): array {
        $token = self::getAccessToken();

        $url = "https://graph.microsoft.com/v1.0/users/{$userEmail}/events";

        return self::httpPostJson($url, $eventData, $token);
    }

    /**
     * Requete HTTP GET
     */
    private static function httpGet(string $url, string $token): array {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json',
                'Prefer: outlook.timezone="' . RDV_TIMEZONE . '"',
            ],
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 400) {
            throw new Exception("Erreur Microsoft Graph (GET {$httpCode}): " . $result);
        }

        return json_decode($result, true) ?: [];
    }

    /**
     * Requete HTTP POST (form-urlencoded)
     */
    private static function httpPost(string $url, array $data, bool $withAuth = false): array {
        $ch = curl_init($url);

        $headers = ['Content-Type: application/x-www-form-urlencoded'];
        if ($withAuth) {
            $headers[] = 'Authorization: Bearer ' . self::$tokenCache;
        }

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query($data),
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $result = curl_exec($ch);
        curl_close($ch);

        return json_decode($result, true) ?: [];
    }

    /**
     * Requete HTTP POST (JSON)
     */
    private static function httpPostJson(string $url, array $data, string $token): array {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($data),
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json',
                'Prefer: outlook.timezone="' . RDV_TIMEZONE . '"',
            ],
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 400) {
            throw new Exception("Erreur Microsoft Graph (POST {$httpCode}): " . $result);
        }

        return json_decode($result, true) ?: [];
    }
}
