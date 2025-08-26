require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Cliente Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'cambiar_en_produccion',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, sameSite: 'lax' }
}));

app.use(express.static(path.join(__dirname, 'public')));

// ----------------------
// Middleware de autenticación
// ----------------------
function authMiddleware(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/');
  }
  next();
}

// ----------------------
// Rutas
// ----------------------

// Registro
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return res.send(`Error al registrar: ${error.message} <br><a href="/">Volver</a>`);
  res.send('Registro exitoso. Revisa tu correo. <br><a href="/">Volver</a>');
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.send(`Error al iniciar sesión: ${error.message} <br><a href="/">Volver</a>`);

  req.session.user = { id: data.user.id, email: data.user.email };
  req.session.access_token = data.session?.access_token; // opcional
  res.redirect('/dashboard');
});

// Dashboard (ruta protegida)
app.get('/dashboard', authMiddleware, (req, res) => {
  res.send(`
    <h1>Bienvenido ${req.session.user.email}</h1>
    <p>ID: ${req.session.user.id}</p>
    <a href="/logout">Cerrar sesión</a>
  `);
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// Servidor
//app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));

// Solo corre el servidor si no estamos en test
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
}
