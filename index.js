require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Cliente Supabase (usa la ANON key aquí)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// middleware
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'cambiar_en_produccion',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // en producción: true (requiere HTTPS)
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Servir archivos estáticos (public/index.html)
app.use(express.static(path.join(__dirname, 'public')));

// Registro con Supabase Auth
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return res.send(`Error al registrar: ${error.message} <br><a href="/">Volver</a>`);
    // Si está habilitada la confirmación por email, el usuario deberá confirmar
    res.send('Registro exitoso. Revisa tu correo para verificar (si está habilitado). <br><a href="/">Volver</a>');
  } catch (err) {
    res.send(`Error inesperado: ${err.message} <br><a href="/">Volver</a>`);
  }
});

// Login con Supabase Auth
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.send(`Error al iniciar sesión: ${error.message} <br><a href="/">Volver</a>`);

    // Guardamos datos mínimos en la sesión
    req.session.user = {
      id: data.user?.id,
      email: data.user?.email
    };
    req.session.access_token = data.session?.access_token; // opcional
    res.redirect('/dashboard');
  } catch (err) {
    res.send(`Error inesperado: ${err.message} <br><a href="/">Volver</a>`);
  }
});

// Ruta protegida
app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  res.send(`
    <h1>Bienvenido ${req.session.user.email}</h1>
    <p>ID: ${req.session.user.id}</p>
    <a href="/logout">Cerrar sesión</a>
  `);
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Iniciar servidor
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
