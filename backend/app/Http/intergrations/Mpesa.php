<?php

namespace App\Http\Integrations;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MPesa
{
    protected $baseUrl;

    public function __construct()
    {
        $this->baseUrl = config('mpesa.env') === 'sandbox'
            ? 'https://sandbox.safaricom.co.ke'
            : 'https://api.safaricom.co.ke';
    }

    public function generateAccessToken()
    {
        $response = Http::withBasicAuth(
            config('mpesa.consumer_key'),
            config('mpesa.consumer_secret')
        )->get("{$this->baseUrl}/oauth/v1/generate?grant_type=client_credentials");

        return $response->json()['access_token'] ?? null;
    }

    public function stkPush($phone, $amount, $description = 'FMS Payment')
    {
        $accessToken = $this->generateAccessToken();
        if (!$accessToken) {
            return ['status' => 'error', 'message' => 'Unable to generate access token'];
        }

        $timestamp = now()->format('YmdHis');
        $password = base64_encode(
            config('mpesa.shortcode') . config('mpesa.passkey') . $timestamp
        );

        $response = Http::withToken($accessToken)->post("{$this->baseUrl}/mpesa/stkpush/v1/processrequest", [
            'BusinessShortCode' => config('mpesa.shortcode'),
            'Password' => $password,
            'Timestamp' => $timestamp,
            'TransactionType' => 'CustomerPayBillOnline',
            'Amount' => $amount,
            'PartyA' => $phone,
            'PartyB' => config('mpesa.shortcode'),
            'PhoneNumber' => $phone,
            'CallBackURL' => config('mpesa.callback_url'),
            'AccountReference' => 'FMS',
            'TransactionDesc' => $description,
        ]);

        $data = $response->json();
        Log::info('M-Pesa STK Push Response:', $data);

        return $data;
    }
}
