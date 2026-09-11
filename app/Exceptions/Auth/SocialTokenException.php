<?php

namespace App\Exceptions\Auth;

use RuntimeException;

/**
 * Dilempar ketika credential sosial gagal diverifikasi server-side.
 */
class SocialTokenException extends RuntimeException {}
