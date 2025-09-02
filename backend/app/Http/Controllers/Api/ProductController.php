<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller; // ✅ FIXED: import the base controller
use App\Models\Product;
use App\Http\Integrations\MPesa;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::query();

        // Filter by species, price, location
        if ($request->has('species')) {
            $query->where('species', $request->species);
        }
        if ($request->has('price_min')) {
            $query->where('price', '>=', $request->price_min);
        }
        if ($request->has('price_max')) {
            $query->where('price', '<=', $request->price_max);
        }
        if ($request->has('location')) {
            $query->where('location', $request->location);
        }

        $products = $query->get();
        return response()->json(['products' => $products]);
    }

    public function storeOrder(Request $request): JsonResponse
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|numeric|min:1',
            'phone' => 'required|string', // M-Pesa phone number
        ]);

        $product = Product::findOrFail($request->product_id);
        if ($product->quantity < $request->quantity) {
            return response()->json(['message' => 'Insufficient stock'], 400);
        }

        // Initiate M-Pesa payment
        $mPesa = new MPesa();
        $paymentResponse = $mPesa->initiatePayment(
            $request->phone,
            $product->price * $request->quantity,
            'GETREECH Order #' . $product->id
        );

        if ($paymentResponse['status'] !== 'success') {
            return response()->json(['message' => 'Payment failed'], 400);
        }

        // Update product quantity
        $product->quantity -= $request->quantity;
        $product->save();

        // Create order (simplified)
        // Add order model and table if needed
        return response()->json(['message' => 'Order placed successfully']);
    }
}
