// ============================================
// BOOK CONTENT DATA
// Combined from updated DOCX files and existing content
// Updated: ${new Date().toISOString()}
// ============================================

import { BookStructure, BookSection, SectionStatus } from '../types';
import { UPDATED_PARTS } from './updatedChapters';
import { REMAINING_CHAPTERS } from './remainingChapters';

// Helper to create a chapter from existing data
function createChapter(id: string, title: string, content: string): BookSection {
  return {
    id,
    title,
    content,
    status: SectionStatus.DRAFT,
    history: [],
  };
}

// ============================================
// PARTS 8 and 10 - Kept from original (not in new DOCX files)
// These will be updated later when new files are provided
// ============================================

const PART_8_CHAPTERS: BookSection[] = [
  createChapter('p8-ch0', 'Ramadan selon les saisons', `<div class="chapter">
<h1 class="chapter-title">Ramadan selon les saisons</h1>
<div class="separator">───── ◆ ─────</div>
<p class="paragraph">Le Ramadan se déplace chaque année d'environ 11 jours dans le calendrier grégorien, ce qui signifie qu'il traverse toutes les saisons sur un cycle d'environ 33 ans. Cette particularité implique que les conditions de jeûne varient considérablement selon la période de l'année.</p>
<h2 class="subtitle">Ramadan en été</h2>
<p class="paragraph">Lorsque le Ramadan tombe en été, les journées sont plus longues et les températures plus élevées. Il est essentiel de:</p>
<ul class="styled-list">
<li>S'hydrater abondamment au moment du ftour et du suhoor</li>
<li>Éviter les activités physiques intenses pendant les heures les plus chaudes</li>
<li>Privilégier les aliments riches en eau comme les concombres, pastèques et melons</li>
<li>Se reposer pendant les heures de grande chaleur si possible</li>
</ul>
<h2 class="subtitle">Ramadan en hiver</h2>
<p class="paragraph">Le jeûne en hiver présente l'avantage de journées plus courtes, mais comporte aussi ses défis:</p>
<ul class="styled-list">
<li>Les repas sont plus rapprochés, attention à ne pas trop manger</li>
<li>Le corps a besoin de plus d'énergie pour maintenir sa température</li>
<li>Privilégier les soupes chaudes et les plats réconfortants mais légers</li>
<li>Maintenir une activité physique modérée pour garder le corps actif</li>
</ul>
</div>`),
];

const PART_10_CHAPTERS: BookSection[] = [
  createChapter('p10-ch0', 'Le diabète et le jeûne', `<div class="chapter">
<h1 class="chapter-title">Le diabète et le jeûne</h1>
<div class="separator">───── ◆ ─────</div>
<p class="paragraph">Le jeûne du Ramadan pour les personnes diabétiques nécessite une attention particulière et un suivi médical adapté. Il est crucial de consulter son médecin avant le début du mois sacré.</p>
<h2 class="subtitle">Diabète de type 1</h2>
<p class="paragraph">Les personnes atteintes de diabète de type 1 insulino-dépendant doivent être particulièrement vigilantes. Le jeûne peut être déconseillé dans certains cas. Une consultation médicale est indispensable pour adapter le traitement.</p>
<h2 class="subtitle">Diabète de type 2</h2>
<p class="paragraph">Pour le diabète de type 2, le jeûne peut être envisagé sous certaines conditions:</p>
<ul class="styled-list">
<li>Un diabète bien équilibré</li>
<li>L'absence de complications</li>
<li>Un suivi médical régulier</li>
<li>Une adaptation du traitement si nécessaire</li>
</ul>
<h2 class="subtitle">Conseils pratiques</h2>
<p class="paragraph">Pour les diabétiques qui jeûnent:</p>
<ul class="styled-list">
<li>Surveiller régulièrement sa glycémie</li>
<li>Éviter les aliments à index glycémique élevé au ftour</li>
<li>Privilégier les glucides complexes au suhoor</li>
<li>Rompre le jeûne immédiatement en cas d'hypoglycémie</li>
<li>Maintenir une bonne hydratation pendant les heures de repas</li>
</ul>
</div>`),
];

// ============================================
// BUILD FINAL BOOK STRUCTURE
// ============================================

// Get the updated parts (p1-p7, p9) from the new DOCX import
const updatedPartsMap: Record<string, typeof UPDATED_PARTS[0]> = {};
for (const part of UPDATED_PARTS) {
  updatedPartsMap[part.id] = part;
}

// Build the complete book structure
const IMPORTED_BOOK_DATA: BookStructure = {
  parts: [
    // Part 1: Fondations (from updated DOCX)
    updatedPartsMap['p1'] || {
      id: 'p1',
      title: 'Fondations',
      chapters: [],
    },
    // Part 2: Le Jeûne & le Corps (from updated DOCX)
    updatedPartsMap['p2'] || {
      id: 'p2',
      title: 'Le Jeûne & le Corps',
      chapters: [],
    },
    // Part 3: Nutrition & Pathologies (from updated DOCX)
    updatedPartsMap['p3'] || {
      id: 'p3',
      title: 'Nutrition & Pathologies',
      chapters: [],
    },
    // Part 4: Alimentation Moderne & Stress (from updated DOCX)
    updatedPartsMap['p4'] || {
      id: 'p4',
      title: 'Alimentation Moderne & Stress',
      chapters: [],
    },
    // Part 5: Inflammation (from updated DOCX)
    updatedPartsMap['p5'] || {
      id: 'p5',
      title: 'Inflammation',
      chapters: [],
    },
    // Part 6: Migraines & Café (from updated DOCX)
    updatedPartsMap['p6'] || {
      id: 'p6',
      title: 'Migraines & Café',
      chapters: [],
    },
    // Part 7: Coups de Pouce & Hijama (from updated DOCX)
    updatedPartsMap['p7'] || {
      id: 'p7',
      title: 'Coups de Pouce & Hijama',
      chapters: [],
    },
    // Part 8: Ramadan selon les Saisons (placeholder - to be updated)
    {
      id: 'p8',
      title: 'Ramadan selon les Saisons',
      chapters: PART_8_CHAPTERS,
    },
    // Part 9: Remèdes & Aliments (from updated DOCX)
    updatedPartsMap['p9'] || {
      id: 'p9',
      title: 'Remèdes & Aliments',
      chapters: [],
    },
    // Part 10: Diabète (placeholder - to be updated)
    {
      id: 'p10',
      title: 'Diabète',
      chapters: PART_10_CHAPTERS,
    },
    // === REMAINING CHAPTERS FROM DOCX (Phases 11-18) ===
    {
      id: 'p11',
      title: 'Nutriments Essentiels',
      chapters: REMAINING_CHAPTERS.slice(0, 3),
    },
    {
      id: 'p12',
      title: 'Conseils Pratiques',
      chapters: REMAINING_CHAPTERS.slice(3, 10),
    },
    {
      id: 'p13',
      title: 'Aromathérapie & Fin Ramadan',
      chapters: REMAINING_CHAPTERS.slice(10, 14),
    },
    {
      id: 'p14',
      title: 'Boissons & Jus',
      chapters: REMAINING_CHAPTERS.slice(14, 16),
    },
    {
      id: 'p15',
      title: 'Recettes Salées',
      chapters: REMAINING_CHAPTERS.slice(16, 52),
    },
    {
      id: 'p16',
      title: 'Desserts & Douceurs',
      chapters: REMAINING_CHAPTERS.slice(52, 67),
    },
    {
      id: 'p17',
      title: 'Annexes',
      chapters: REMAINING_CHAPTERS.slice(67),
    },
  ],
  metadata: {
    title: 'La Santé dans l\'Assiette',
    subtitle: '30 Jours pour se soigner - Ramadan, ma guérison',
    author: 'Oum Soumayya',
    authorCredentials: 'Praticienne en Hijama, Naturopathie, Acupuncture, Réflexologie, Massothérapie, Micronutrition',
    version: '2.1',
    lastUpdated: Date.now(),
    totalChapters: 116, // Updated count
    totalWords: 35000, // Approximate
  },
};

export default IMPORTED_BOOK_DATA;
