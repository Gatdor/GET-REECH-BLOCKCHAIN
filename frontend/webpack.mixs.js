const mix = require('laravel-mix');

mix.js('src/app.jsx', 'public/js')
   .react()
   .sass('src/app.scss', 'public/css')
   .setPublicPath('public');