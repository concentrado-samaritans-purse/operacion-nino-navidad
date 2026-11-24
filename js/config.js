const SUPABASE_URL = 'https://otfskfmenzjtceuwcicv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90ZnNrZm1lbnpqdGNldXdjaWN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MTEyNzgsImV4cCI6MjEwNTM4NzI3OH0.zgUYxWhKMu_KfXazJ-XrkpfwImClLBmsIW3lAMlbiIE';
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Estado global compartido
let zonaActualId = null;
let iglesiaSeleccionada = null;
let datosIglesiasZona = [];

// Contraseña maestra universal
const MASTER_ADMIN_PASS = 'admin123';

// Catálogo maestro de zonas (incluyendo Cd. Alemán y Coatepec con contraseña admin123)
const ZONAS_CATALOGO = [
    { id: 1, nombre: 'San Andrés', pass: 'admin123' },
    { id: 2, nombre: 'Tezonapa', pass: 'admin123' },
    { id: 3, nombre: 'Orizaba', pass: 'admin123' },
    { id: 4, nombre: 'Xalapa', pass: 'admin123' },
    { id: 5, nombre: 'Manlio', pass: 'admin123' },
    { id: 6, nombre: 'Medellín', pass: 'admin123' },
    { id: 7, nombre: 'Carlos A. Carrillo', pass: 'admin123' },
    { id: 8, nombre: 'Sayula', pass: 'admin123' },
    { id: 9, nombre: 'Cosamaloapan', pass: 'admin123' },
    { id: 10, nombre: 'Cd. Alemán', pass: 'admin123' },
    { id: 11, nombre: 'Coatepec', pass: 'admin123' }
];

// Categorías de edades
const CATEGORIAS_EDAD = [
    { id: 'ninas_2_4', genero: 'niña', rango: '2-4' },
    { id: 'ninos_2_4', genero: 'niño', rango: '2-4' },
    { id: 'ninas_5_9', genero: 'niña', rango: '5-9' },
    { id: 'ninos_5_9', genero: 'niño', rango: '5-9' },
    { id: 'ninas_10_14', genero: 'niña', rango: '10-14' },
    { id: 'ninos_10_14', genero: 'niño', rango: '10-14' }
];
