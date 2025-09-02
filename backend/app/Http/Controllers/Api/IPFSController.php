<?php
namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Controller;

class IPFSController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function uploadIpfs(Request $request)
    {
        Log::info('IPFSController@uploadIpfs called with request:', [
            'has_file' => $request->hasFile('file'),
            'files' => $request->allFiles(),
            'headers' => $request->headers->all(),
            'user' => auth()->user() ? auth()->user()->toArray() : 'Unauthenticated',
        ]);

        try {
            $request->validate([
                'file' => 'required|file|mimes:jpg,jpeg,png|max:20480',
            ], [
                'file.required' => 'No file was provided.',
                'file.mimes' => 'Only JPEG or PNG images are allowed.',
                'file.max' => 'The file size must not exceed 20MB.',
            ]);

            $file = $request->file('file');
            $fileName = time() . '_' . $file->getClientOriginalName();
            $path = $file->storeAs('ipfs_uploads', $fileName, 'public');

            Log::info('IPFS upload attempt', [
                'file_name' => $fileName,
                'size' => $file->getSize(),
                'mime' => $file->getMimeType(),
                'path' => $path,
            ]);

            $pinataJwt = env('PINATA_JWT');
            Log::info('PINATA_JWT status:', [
                'jwt_prefix' => substr($pinataJwt ?? '', 0, 10),
                'is_set' => !empty($pinataJwt),
                'is_valid_format' => $pinataJwt ? preg_match('/^eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/', $pinataJwt) : false,
            ]);

            if (!$pinataJwt || !preg_match('/^eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/', $pinataJwt)) {
                Log::error('IPFS upload failed: Invalid or missing PINATA_JWT', [
                    'jwt_prefix' => substr($pinataJwt ?? '', 0, 10),
                ]);
                return response()->json(['message' => 'Pinata JWT is invalid or not configured'], 500);
            }

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $pinataJwt,
            ])->attach(
                'file',
                file_get_contents(Storage::disk('public')->path($path)),
                $fileName
            )->post('https://api.pinata.cloud/pinning/pinFileToIPFS');

            if ($response->failed()) {
                Log::error('IPFS upload failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                    'headers' => $response->headers(),
                ]);
                return response()->json([
                    'message' => 'Failed to upload to IPFS: ' . $response->body(),
                ], $response->status() ?: 500);
            }

            $ipfsHash = $response->json()['IpfsHash'];

            Log::info('IPFS upload success', [
                'hash' => $ipfsHash,
                'url' => "https://gateway.pinata.cloud/ipfs/{$ipfsHash}",
            ]);

            Storage::disk('public')->delete($path);

            return response()->json([
                'url' => "https://gateway.pinata.cloud/ipfs/{$ipfsHash}",
            ], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('IPFS upload validation error:', [
                'errors' => $e->errors(),
                'file_name' => $fileName ?? 'N/A',
            ]);
            return response()->json([
                'message' => 'IPFS upload error: Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('IPFS upload exception', [
                'message' => $e->getMessage(),
                'file_name' => $fileName ?? 'N/A',
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['message' => 'IPFS upload error: ' . $e->getMessage()], 500);
        }
    }
}