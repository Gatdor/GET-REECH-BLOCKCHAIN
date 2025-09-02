// src/components/ProductCard.jsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCartPlus } from '@fortawesome/free-solid-svg-icons';

const ProductCard = ({ product, addToCart }) => {
  return (
    <div className="col-md-4 col-sm-6 mb-4">
      <div className="card">
        <img
          src={product.image || 'https://via.placeholder.com/200'}
          className="card-img-top"
          alt={product.name}
          style={{ height: '200px', objectFit: 'cover' }}
        />
        <div className="card-body">
          <h5 className="card-title text-white">{product.name}</h5>
          <p className="card-text text-white">KSh {product.price}/kg</p>
          <p className="card-text text-white">Stock: {product.stock} kg</p>
          <button
            className="btn btn-primary w-100"
            onClick={() => addToCart(product)}
            aria-label={`Add ${product.name} to cart`}
          >
            <FontAwesomeIcon icon={faCartPlus} className="me-2" />
            Add to Cart (Ongeza kwenye Rukwama)
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;