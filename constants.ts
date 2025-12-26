
import { Document } from './types';

export const INITIAL_DOCUMENTS: Document[] = [
    {
        id: 1,
        title: "El Gran Gatsby.pdf",
        meta: "12 MB • 45% Completado",
        progress: 45,
        iconColor: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-100 dark:bg-red-900/20",
        icon: "picture_as_pdf",
        content: "En mis años de mozo y más vulnerable, mi padre me dio un consejo que desde entonces no ha dejado de darme vueltas en la cabeza. Siempre que te sientas inclinado a criticar a alguien —me dijo—, ten presente que no todo el mundo ha tenido las ventajas que tú tuviste."
    },
    {
        id: 2,
        title: "Propuesta de Proyecto_v2.docx",
        meta: "2.4 MB • 10% Completado",
        progress: 10,
        iconColor: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-100 dark:bg-blue-900/20",
        icon: "description",
        content: "El objetivo de este proyecto es implementar una red neuronal convolucional para la detección temprana de anomalías en imágenes satelitales."
    },
    {
        id: 3,
        title: "Notas de Clase - Historia.txt",
        meta: "156 KB • Sin Empezar",
        progress: 0,
        iconColor: "text-slate-600 dark:text-slate-400",
        bgColor: "bg-slate-200 dark:bg-slate-800",
        icon: "article",
        content: "La Revolución Francesa fue un conflicto social y político, con diversos periodos de violencia, que convulsionó Francia y, por extensión de sus implicaciones, a otras naciones de Europa que enfrentaban a partidarios y opositores del sistema conocido como el Antiguo Régimen."
    },
    {
        id: 4,
        title: "Moby Dick.epub",
        meta: "4.5 MB • 78% Completado",
        progress: 78,
        iconColor: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-100 dark:bg-orange-900/20",
        icon: "book_2",
        content: "Llamadme Ismael. Hace unos años —no importa cuánto hace exactamente—, teniendo poco o ningún dinero en el bolsillo, y nada en particular que me interesara en tierra, pensé que me iría a navegar un poco por ahí, para ver la parte acuática del mundo."
    }
];

export const VOICES = [
    { name: 'Kore', label: 'Kore (Juvenil)' },
    { name: 'Puck', label: 'Puck (Enérgico)' },
    { name: 'Charon', label: 'Charon (Sabio)' },
    { name: 'Fenrir', label: 'Fenrir (Profundo)' },
    { name: 'Zephyr', label: 'Zephyr (Cálido)' }
];
