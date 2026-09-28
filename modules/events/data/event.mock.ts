import type { TicketEvent } from "@/modules/events/types/event.types";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
// Lima no tiene horario de verano: su desfase con UTC es siempre -5 h.
const LIMA_UTC_OFFSET_HOURS = -5;

/**
 * ISO UTC del día de Lima que cae `days` días después de hoy, a la hora local
 * de Lima indicada. Con `days >= 1` el resultado siempre es futuro.
 */
function daysFromNow(days: number, limaHour: number, limaMinute = 0): string {
  const shifted = new Date(
    Date.now() + days * DAY_MS + LIMA_UTC_OFFSET_HOURS * HOUR_MS,
  );
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
      limaHour - LIMA_UTC_OFFSET_HOURS,
      limaMinute,
    ),
  ).toISOString();
}

export const eventsMock: TicketEvent[] = [
  {
    id: "evt-001",
    slug: "noche-de-rock-andino",
    title: "Noche de Rock Andino",
    category: "concerts",
    imageSrc: "/images/events/rock-concert-crowd.jpg",
    imageAlt:
      "Público en silueta con las manos en alto frente a un escenario con haces de luz azul, con la banda a lo lejos",
    startsAt: daysFromNow(2, 20),
    venue: "Arena Pacífico",
    city: "Lima",
    minPrice: 90,
    status: "low-stock",
    featured: true,
  },
  {
    id: "evt-002",
    slug: "sesion-acustica-entre-volcanes",
    title: "Sesión Acústica entre Volcanes",
    category: "concerts",
    imageSrc: "/images/events/acoustic-live-band.jpg",
    imageAlt:
      "Dos músicos sentados en taburetes con guitarras acústicas y un micrófono, entre niebla verde",
    startsAt: daysFromNow(5, 19, 30),
    venue: "Teatro Campiña Sur",
    city: "Arequipa",
    minPrice: 55,
    status: "available",
    featured: false,
  },
  {
    id: "evt-003",
    slug: "gala-sinfonica-de-primavera",
    title: "Gala Sinfónica de Primavera",
    category: "concerts",
    imageSrc: "/images/events/orchestra-concert-hall.jpg",
    imageAlt:
      "Sala de conciertos llena de público con una orquesta sinfónica en el escenario",
    startsAt: daysFromNow(12, 19),
    venue: "Gran Sala Sinfónica",
    city: "Lima",
    minPrice: 120,
    status: "available",
    featured: false,
  },
  {
    id: "evt-004",
    slug: "festival-sol-y-ritmo",
    title: "Festival Sol y Ritmo",
    category: "festivals",
    imageSrc: "/images/events/festival-main-stage.jpg",
    imageAlt:
      "Escenario principal de un festival de noche con lluvia de serpentinas, luces y una multitud de espaldas",
    startsAt: daysFromNow(3, 19),
    venue: "Explanada Sol Naciente",
    city: "Lima",
    minPrice: 150,
    status: "available",
    featured: true,
  },
  {
    id: "evt-005",
    slug: "noche-electronica-pulso",
    title: "Noche Electrónica Pulso",
    category: "festivals",
    imageSrc: "/images/events/electronic-dj-night.jpg",
    imageAlt:
      "DJ con gorra y auriculares visto de espaldas, con un brazo en alto ante una pista de baile llena, en blanco y negro",
    startsAt: daysFromNow(15, 21, 30),
    venue: "Club Nébula",
    city: "Trujillo",
    minPrice: 70,
    status: "low-stock",
    featured: false,
  },
  {
    id: "evt-006",
    slug: "clasico-del-norte-halcones-vs-condores",
    title: "Clásico del Norte: Halcones vs Cóndores",
    category: "sports",
    imageSrc: "/images/events/football-stadium-night.jpg",
    imageAlt:
      "Estadio de fútbol iluminado de noche, con las gradas llenas y el campo verde",
    startsAt: daysFromNow(4, 20),
    venue: "Estadio Municipal del Norte",
    city: "Trujillo",
    minPrice: 45,
    status: "sold-out",
    featured: false,
  },
  {
    id: "evt-007",
    slug: "corrida-nocturna-10k-ciudad-luz",
    title: "Corrida Nocturna 10K Ciudad Luz",
    category: "sports",
    imageSrc: "/images/events/marathon-runners-city.jpg",
    imageAlt:
      "Vista aérea nocturna de una multitud de corredores con camisetas amarillas por una calle arbolada de la ciudad",
    startsAt: daysFromNow(9, 19),
    venue: "Avenida del Bosque",
    city: "Lima",
    minPrice: 60,
    status: "available",
    featured: false,
  },
  {
    id: "evt-008",
    slug: "copa-andina-de-basquet",
    title: "Copa Andina de Básquet",
    category: "sports",
    imageSrc: "/images/events/basketball-court-game.jpg",
    imageAlt:
      "Dos jugadores disputando un balón sobre una cancha de parquet, vistos de torso y piernas",
    startsAt: daysFromNow(20, 20),
    venue: "Coliseo Inti",
    city: "Cusco",
    minPrice: 35,
    status: "available",
    featured: false,
  },
  {
    id: "evt-009",
    slug: "noche-de-opera-y-zarzuela",
    title: "Noche de Ópera y Zarzuela",
    category: "theater",
    imageSrc: "/images/events/theater-stage-curtain.jpg",
    imageAlt:
      "Telón de terciopelo rojo con detalles dorados y un escudo en un teatro de ópera clásico",
    startsAt: daysFromNow(18, 20),
    venue: "Gran Teatro del Sol",
    city: "Lima",
    minPrice: 110,
    status: "available",
    featured: false,
  },
  {
    id: "evt-010",
    slug: "la-ultima-funcion",
    title: "La Última Función",
    category: "theater",
    imageSrc: "/images/events/theater-play-actors.jpg",
    imageAlt:
      "Actores en un escenario oscuro con candelabros: una pareja con vestuario de época y un actor con sombrero de copa",
    startsAt: daysFromNow(1, 20, 30),
    venue: "Teatro Kusi",
    city: "Cusco",
    minPrice: 50,
    status: "available",
    featured: true,
  },
  {
    id: "evt-011",
    slug: "gran-circo-arcoiris",
    title: "Gran Circo Arcoíris",
    category: "family",
    imageSrc: "/images/events/family-circus-show.jpg",
    imageAlt:
      "Payaso con traje amarillo señalando hacia un lado, ante un fondo de rayas moradas y cortinas rojas de circo",
    startsAt: daysFromNow(6, 19),
    venue: "Carpa Arcoíris",
    city: "Arequipa",
    minPrice: 40,
    status: "available",
    featured: true,
  },
  {
    id: "evt-012",
    slug: "teatrino-de-titeres-el-zorro-y-el-lobo",
    title: "Teatrino de Títeres: El Zorro y el Lobo",
    category: "family",
    imageSrc: "/images/events/kids-puppet-show.jpg",
    imageAlt:
      "Títeres de zorro y lobo asomando por el escenario de un teatrino de títeres infantil",
    startsAt: daysFromNow(10, 19),
    venue: "Casa de la Cultura Infantil",
    city: "Trujillo",
    minPrice: 25,
    status: "low-stock",
    featured: false,
  },
];
