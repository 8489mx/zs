import { useState } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { CustomSelect } from '@/shared/ui/custom-select';
import { contractingApi } from '../api/contracting.api';

interface ScheduleGeneratorModalProps {
  open: boolean;
  projectId: string;
  projectName?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface GeneratedTaskPreview {
  taskCode: string;
  wbsCode: string;
  taskName: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  isCriticalPath: boolean;
  category: string;
}

type ProjectScope = 'full_turnkey' | 'concrete_structure' | 'finishing_only';

const SCOPE_OPTIONS = [
  { value: 'full_turnkey', label: 'مشروع متكامل تسليم مفتاح (حفر + خرسانات + تشطيبات + تسليم)' },
  { value: 'concrete_structure', label: 'هيكل إنشائي وعظم فقط (حفر + أساسات + خرسانات مسلحة + مباني)' },
  { value: 'finishing_only', label: 'تشطيبات متكاملة فقط (كهروميكانيك + محارة + أرضيات + دهانات)' },
];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function ScheduleGeneratorModal({
  open,
  projectId,
  projectName = '',
  onClose,
  onSuccess,
}: ScheduleGeneratorModalProps) {
  const [activeTab, setActiveTab] = useState<'wizard' | 'excel'>('wizard');
  const [projectScope, setProjectScope] = useState<ProjectScope>('full_turnkey');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [floorsCount, setFloorsCount] = useState<number>(4);
  const [includeBasement, setIncludeBasement] = useState(false);
  const [includeRoof, setIncludeRoof] = useState(true);

  // Production rates
  const [concreteDaysPerFloor, setConcreteDaysPerFloor] = useState<number>(14);
  const [masonryDaysPerFloor, setMasonryDaysPerFloor] = useState<number>(10);
  const [plasterPrepDays, _setPlasterPrepDays] = useState<number>(5);
  const [plasterFillDays, _setPlasterFillDays] = useState<number>(12);

  const [generating, setGenerating] = useState(false);
  const [progressCount, setProgressCount] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Generate Comprehensive Preview Tasks
  const generatePreview = (): GeneratedTaskPreview[] => {
    const list: GeneratedTaskPreview[] = [];
    let taskCounter = 1;

    // Build floor names
    const floors: string[] = [];
    if (includeBasement) floors.push('البدروم');
    floors.push('الدور الأرضي');
    for (let i = 1; i <= floorsCount; i++) {
      floors.push(
        `الدور ${
          i === 1
            ? 'الأول'
            : i === 2
            ? 'الثاني'
            : i === 3
            ? 'الثالث'
            : i === 4
            ? 'الرابع'
            : i === 5
            ? 'الخامس'
            : i === 6
            ? 'السادس'
            : i === 7
            ? 'السابع'
            : i === 8
            ? 'الثامن'
            : i === 9
            ? 'التاسع'
            : `المتكرر (${i})`
        }`
      );
    }
    if (includeRoof) floors.push('دور السطح (الروف)');

    let currentDate = startDate;

    const includeStructural = projectScope === 'full_turnkey' || projectScope === 'concrete_structure';
    const includeFinishing = projectScope === 'full_turnkey' || projectScope === 'finishing_only';

    // 1. الأعمال التحضيرية والأرضية (Earthworks)
    if (includeStructural) {
      const surveyEnd = addDays(currentDate, 5);
      list.push({
        taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
        wbsCode: '1.1',
        taskName: 'الرفع المساحي والميزانية الشبكية وتجهيز وسور الموقع',
        startDate: currentDate,
        endDate: surveyEnd,
        durationDays: 5,
        isCriticalPath: true,
        category: 'الأعمال الترابية',
      });

      const excavStart = addDays(surveyEnd, 1);
      const excavEnd = addDays(excavStart, 10);
      list.push({
        taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
        wbsCode: '1.2',
        taskName: 'أعمال الحفر وتنسيق المناسيب ونقل نواتج الحفر للمقالب العمومية',
        startDate: excavStart,
        endDate: excavEnd,
        durationDays: 10,
        isCriticalPath: true,
        category: 'الأعمال الترابية',
      });

      const subgradeStart = addDays(excavEnd, 1);
      const subgradeEnd = addDays(subgradeStart, 7);
      list.push({
        taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
        wbsCode: '1.3',
        taskName: 'توريد وفرش ودمك طبقات الإحلال واختبارات الكثافة الحقلية',
        startDate: subgradeStart,
        endDate: subgradeEnd,
        durationDays: 7,
        isCriticalPath: true,
        category: 'الأعمال الترابية',
      });

      currentDate = addDays(subgradeEnd, 1);

      // 2. خرسانات الأساسات والأرضيات (Substructure & SOG)
      const pccEnd = addDays(currentDate, 4);
      list.push({
        taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
        wbsCode: '2.1',
        taskName: 'صب الخرسانة العادية أسفل الأساسات (فرشة النظافة)',
        startDate: currentDate,
        endDate: pccEnd,
        durationDays: 4,
        isCriticalPath: true,
        category: 'أساسات وخرسانات مدفونة',
      });

      const rccStart = addDays(pccEnd, 1);
      const rccEnd = addDays(rccStart, 12);
      list.push({
        taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
        wbsCode: '2.2',
        taskName: 'نجارة وحدادة وصب القواعد المسلحة / اللبشة',
        startDate: rccStart,
        endDate: rccEnd,
        durationDays: 12,
        isCriticalPath: true,
        category: 'أساسات وخرسانات مدفونة',
      });

      const bituStart = addDays(rccEnd, 2);
      const bituEnd = addDays(bituStart, 3);
      list.push({
        taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
        wbsCode: '2.3',
        taskName: 'عزل البيتومين المؤكسد للأساسات والخرسانات الملامسة للتربة',
        startDate: bituStart,
        endDate: bituEnd,
        durationDays: 3,
        isCriticalPath: false,
        category: 'أساسات وخرسانات مدفونة',
      });

      const neckStart = addDays(bituEnd, 1);
      const neckEnd = addDays(neckStart, 5);
      list.push({
        taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
        wbsCode: '2.4',
        taskName: 'نجارة وحدادة وصب رقاب الأعمدة وعزلها',
        startDate: neckStart,
        endDate: neckEnd,
        durationDays: 5,
        isCriticalPath: true,
        category: 'أساسات وخرسانات مدفونة',
      });

      const tieStart = addDays(neckEnd, 1);
      const tieEnd = addDays(tieStart, 7);
      list.push({
        taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
        wbsCode: '2.5',
        taskName: 'نجارة وحدادة وصب ميدات الربط الأرضية (Tie Beams) وعزلها',
        startDate: tieStart,
        endDate: tieEnd,
        durationDays: 7,
        isCriticalPath: true,
        category: 'أساسات وخرسانات مدفونة',
      });

      const backfillStart = addDays(tieEnd, 2);
      const backfillEnd = addDays(backfillStart, 5);
      list.push({
        taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
        wbsCode: '2.6',
        taskName: 'أعمال الردم الميكانيكي على طبقات مع الدمك',
        startDate: backfillStart,
        endDate: backfillEnd,
        durationDays: 5,
        isCriticalPath: true,
        category: 'أساسات وخرسانات مدفونة',
      });

      const sogStart = addDays(backfillEnd, 1);
      const sogEnd = addDays(sogStart, 5);
      list.push({
        taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
        wbsCode: '2.7',
        taskName: 'صب خرسانة الأرضيات Slab on Grade (SOG) مع الشبك وفواصل التمدد',
        startDate: sogStart,
        endDate: sogEnd,
        durationDays: 5,
        isCriticalPath: true,
        category: 'أساسات وخرسانات مدفونة',
      });

      currentDate = addDays(sogEnd, 1);

      // 3. الهيكل الخرساني العلوي بالأدوار (Superstructure)
      floors.forEach((fl, idx) => {
        const colStart = currentDate;
        const colEnd = addDays(colStart, 6);
        list.push({
          taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
          wbsCode: `3.${idx * 2 + 1}`,
          taskName: `نجارة وحدادة وصب أعمدة - ${fl}`,
          startDate: colStart,
          endDate: colEnd,
          durationDays: 6,
          isCriticalPath: true,
          category: 'الهيكل الخرساني العلوي',
        });

        const slabStart = addDays(colEnd, 1);
        const slabEnd = addDays(slabStart, concreteDaysPerFloor - 6 > 6 ? concreteDaysPerFloor - 6 : 8);
        list.push({
          taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
          wbsCode: `3.${idx * 2 + 2}`,
          taskName: `نجارة وتسليح وتمديد خراطيم وصب سقف - ${fl}`,
          startDate: slabStart,
          endDate: slabEnd,
          durationDays: concreteDaysPerFloor - 6 > 6 ? concreteDaysPerFloor - 6 : 8,
          isCriticalPath: true,
          category: 'الهيكل الخرساني العلوي',
        });

        currentDate = addDays(slabEnd, 1);
      });

      if (includeRoof) {
        const roofSvcEnd = addDays(currentDate, 7);
        list.push({
          taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
          wbsCode: '3.99',
          taskName: 'غرف خدمات السطح وسترة الروف (Parapet) وغرفة المصعد والخزان',
          startDate: currentDate,
          endDate: roofSvcEnd,
          durationDays: 7,
          isCriticalPath: true,
          category: 'الهيكل الخرساني العلوي',
        });
        currentDate = addDays(roofSvcEnd, 1);
      }

      // 4. أعمال المباني بالأدوار (Masonry)
      floors.forEach((fl, idx) => {
        const masEnd = addDays(currentDate, masonryDaysPerFloor);
        list.push({
          taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
          wbsCode: `4.${idx + 1}`,
          taskName: `أعمال المباني والقواطيع وعتب الفتحات - ${fl}`,
          startDate: currentDate,
          endDate: masEnd,
          durationDays: masonryDaysPerFloor,
          isCriticalPath: true,
          category: 'أعمال المباني',
        });
        currentDate = addDays(masEnd, 1);
      });
    }

    // 5. التأسيسات الكهروميكانيكية بالأدوار (MEP 1st Fix)
    if (includeFinishing) {
      const mepBaseDate = includeStructural ? addDays(currentDate, -Math.round(masonryDaysPerFloor * 1.5)) : currentDate;
      let mepFloorDate = mepBaseDate;

      floors.forEach((fl, idx) => {
        const elecEnd = addDays(mepFloorDate, 5);
        list.push({
          taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
          wbsCode: `5.${idx * 3 + 1}`,
          taskName: `تأسيس الكهرباء ومواسير الإنارة وعلب الماجيك - ${fl}`,
          startDate: mepFloorDate,
          endDate: elecEnd,
          durationDays: 5,
          isCriticalPath: false,
          category: 'التأسيسات الكهروميكانيكية',
        });

        const plumbStart = addDays(mepFloorDate, 2);
        const plumbEnd = addDays(plumbStart, 6);
        list.push({
          taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
          wbsCode: `5.${idx * 3 + 2}`,
          taskName: `تأسيس شبكات التغذية والصرف واختبار الضغط بالبار - ${fl}`,
          startDate: plumbStart,
          endDate: plumbEnd,
          durationDays: 6,
          isCriticalPath: false,
          category: 'التأسيسات الكهروميكانيكية',
        });

        const hvacStart = addDays(mepFloorDate, 4);
        const hvacEnd = addDays(hvacStart, 4);
        list.push({
          taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
          wbsCode: `5.${idx * 3 + 3}`,
          taskName: `مسارات نحاس وصرف التكييف وشبكات التيار الخفيف - ${fl}`,
          startDate: hvacStart,
          endDate: hvacEnd,
          durationDays: 4,
          isCriticalPath: false,
          category: 'التأسيسات الكهروميكانيكية',
        });

        mepFloorDate = addDays(mepFloorDate, 5);
      });

      // 6. أعمال العزل المائي والحراري (Waterproofing)
      const waterBathStart = addDays(mepFloorDate, 1);
      const waterBathEnd = addDays(waterBathStart, 6);
      list.push({
        taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
        wbsCode: '6.1',
        taskName: 'عزل أرضيات الحمامات والمطابخ واختبار الغمر بالماء 48 ساعة',
        startDate: waterBathStart,
        endDate: waterBathEnd,
        durationDays: 6,
        isCriticalPath: true,
        category: 'العوازل المائية والحرارية',
      });

      if (includeRoof) {
        const waterRoofStart = addDays(waterBathEnd, 1);
        const waterRoofEnd = addDays(waterRoofStart, 10);
        list.push({
          taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
          wbsCode: '6.2',
          taskName: 'عزل السطح النهائي (مائي ممبرين + حراري فوم XPS + خرسانة ميول)',
          startDate: waterRoofStart,
          endDate: waterRoofEnd,
          durationDays: 10,
          isCriticalPath: true,
          category: 'العوازل المائية والحرارية',
        });
      }

      // 7. أعمال بياض المحارة بالأدوار (Plastering)
      let currentPlasterStart = addDays(waterBathEnd, 2);
      floors.forEach((fl, idx) => {
        const prepEnd = addDays(currentPlasterStart, plasterPrepDays);
        list.push({
          taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
          wbsCode: `7.${idx * 2 + 1}`,
          taskName: `طرطشة وبؤج وأوتار وشبك فايبر - ${fl}`,
          startDate: currentPlasterStart,
          endDate: prepEnd,
          durationDays: plasterPrepDays,
          isCriticalPath: true,
          category: 'بياض المحارة',
        });

        const fillEnd = addDays(prepEnd, plasterFillDays);
        list.push({
          taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
          wbsCode: `7.${idx * 2 + 2}`,
          taskName: `ملو وتنعيم بياض المحارة - ${fl}`,
          startDate: prepEnd,
          endDate: fillEnd,
          durationDays: plasterFillDays,
          isCriticalPath: true,
          category: 'بياض المحارة',
        });

        currentPlasterStart = addDays(prepEnd, 4);
      });

      // 8. أعمال الأرضيات والكسوات (Flooring & Tiling)
      const tileStart = addDays(currentPlasterStart, 5);
      const tileEnd = addDays(tileStart, 15);
      list.push({
        taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
        wbsCode: '8.1',
        taskName: 'توريد وتركيب سيراميك وبورسلين الأرضيات والحوائط للحمامات والغرف',
        startDate: tileStart,
        endDate: tileEnd,
        durationDays: 15,
        isCriticalPath: true,
        category: 'الأرضيات والكسوات',
      });

      const marbleStart = addDays(tileStart, 5);
      const marbleEnd = addDays(marbleStart, 10);
      list.push({
        taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
        wbsCode: '8.2',
        taskName: 'توريد وتركيب رخام السلالم والمداخل وبسطات الأدوار والوزرات',
        startDate: marbleStart,
        endDate: marbleEnd,
        durationDays: 10,
        isCriticalPath: false,
        category: 'الأرضيات والكسوات',
      });

      // 9. النجارة والحدادة والألوميتال (Carpentry, Metal & Aluminum)
      const frameStart = addDays(currentPlasterStart, -10 > 0 ? -10 : 0);
      const frameEnd = addDays(frameStart, 5);
      list.push({
        taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
        wbsCode: '9.1',
        taskName: 'تثبيت الحلوق الخشبية للأبواب (Zafra)',
        startDate: frameStart,
        endDate: frameEnd,
        durationDays: 5,
        isCriticalPath: false,
        category: 'النجارة والألوميتال والكريتال',
      });

      const alumStart = addDays(tileEnd, 1);
      const alumEnd = addDays(alumStart, 10);
      list.push({
        taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
        wbsCode: '9.2',
        taskName: 'توريد وتركيب شبابيك وواجهات الألوميتال مع الزجاج المزدوج',
        startDate: alumStart,
        endDate: alumEnd,
        durationDays: 10,
        isCriticalPath: true,
        category: 'النجارة والألوميتال والكريتال',
      });

      const critallStart = addDays(marbleEnd, 1);
      const critallEnd = addDays(critallStart, 8);
      list.push({
        taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
        wbsCode: '9.3',
        taskName: 'أعمال الكريتال ودرابزين السلالم واللكونات وبوابات المداخل والسطح',
        startDate: critallStart,
        endDate: critallEnd,
        durationDays: 8,
        isCriticalPath: false,
        category: 'النجارة والألوميتال والكريتال',
      });

      const doorLeafStart = addDays(alumEnd, 2);
      const doorLeafEnd = addDays(doorLeafStart, 7);
      list.push({
        taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
        wbsCode: '9.4',
        taskName: 'تركيب ضلف الأبواب الخشبية والمقابض والكوالين ومصدات الأبواب',
        startDate: doorLeafStart,
        endDate: doorLeafEnd,
        durationDays: 7,
        isCriticalPath: false,
        category: 'النجارة والألوميتال والكريتال',
      });

      // 10. الأسقف المعلقة والدهانات وتشطيب الواجهات (Ceilings, Painting & Facades)
      const gypStart = addDays(tileEnd, 1);
      const gypEnd = addDays(gypStart, 10);
      list.push({
        taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
        wbsCode: '10.1',
        taskName: 'توريد وتركيب الأسقف المعلقة والجبسوم بورد وفتحات الإضاءة',
        startDate: gypStart,
        endDate: gypEnd,
        durationDays: 10,
        isCriticalPath: false,
        category: 'الأسقف والدهانات والواجهات',
      });

      const paintStart = addDays(gypEnd, 1);
      const paintEnd = addDays(paintStart, 14);
      list.push({
        taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
        wbsCode: '10.2',
        taskName: 'سكاكين المعجون والبطانة وتشطيب الدهانات الداخلية للغرف والأسقف',
        startDate: paintStart,
        endDate: paintEnd,
        durationDays: 14,
        isCriticalPath: true,
        category: 'الأسقف والدهانات والواجهات',
      });

      const facadeStart = addDays(tileEnd, 3);
      const facadeEnd = addDays(facadeStart, 15);
      list.push({
        taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
        wbsCode: '10.3',
        taskName: 'سيلر وتشطيب سافيتو/جرافياتو للواجهات الخارجية الأربع',
        startDate: facadeStart,
        endDate: facadeEnd,
        durationDays: 15,
        isCriticalPath: false,
        category: 'الأسقف والدهانات والواجهات',
      });

      // 11. التشطيبات النهائية والتسليم (Final Handover)
      const elecFinalStart = addDays(paintEnd, 1);
      const elecFinalEnd = addDays(elecFinalStart, 6);
      list.push({
        taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
        wbsCode: '11.1',
        taskName: 'تشطيب الكهرباء (تركيب الوشوش والمفاتيح والبرايز ووحدات الإنارة والسبوتات)',
        startDate: elecFinalStart,
        endDate: elecFinalEnd,
        durationDays: 6,
        isCriticalPath: true,
        category: 'التشطيب والتسليم النهائي',
      });

      const plumbFinalStart = addDays(elecFinalStart, 1);
      const plumbFinalEnd = addDays(plumbFinalStart, 5);
      list.push({
        taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
        wbsCode: '11.2',
        taskName: 'تشطيب السباكة (تثبيت الأطقم الصحية وخلاطات المياه وكبائن الشاور)',
        startDate: plumbFinalStart,
        endDate: plumbFinalEnd,
        durationDays: 5,
        isCriticalPath: true,
        category: 'التشطيب والتسليم النهائي',
      });

      const cleanStart = addDays(plumbFinalEnd, 1);
      const cleanEnd = addDays(cleanStart, 5);
      list.push({
        taskCode: `TSK-${String(taskCounter++).padStart(3, '0')}`,
        wbsCode: '11.3',
        taskName: 'نظافة الموقع العام وإزالة المخلفات وإصدار محضر التسليم الابتدائي للمالك',
        startDate: cleanStart,
        endDate: cleanEnd,
        durationDays: 5,
        isCriticalPath: true,
        category: 'التشطيب والتسليم النهائي',
      });
    }

    return list;
  };

  const previewTasks = generatePreview();

  const handleCommitSchedule = async () => {
    if (!projectId) return;
    setGenerating(true);
    setErrorMsg(null);
    setProgressCount(0);
    try {
      // Chunk tasks in groups of 4 for stable and fast creation
      const chunkSize = 4;
      for (let i = 0; i < previewTasks.length; i += chunkSize) {
        const chunk = previewTasks.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map((t) =>
            contractingApi.createScheduleTask(projectId, {
              taskCode: t.taskCode,
              wbsCode: t.wbsCode,
              taskName: t.taskName,
              startDate: t.startDate,
              endDate: t.endDate,
              durationDays: t.durationDays,
              isCriticalPath: t.isCriticalPath,
              status: 'not_started',
              progressPercent: 0,
            })
          )
        );
        setProgressCount(Math.min(i + chunkSize, previewTasks.length));
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to commit generated schedule:', err);
      setErrorMsg(err?.message || 'حدث خطأ أثناء حفظ الجدول الزمني');
    } finally {
      setGenerating(false);
    }
  };

  const handleImportExcelSample = async () => {
    setStartDate('2024-01-01');
    setFloorsCount(5);
    setIncludeRoof(true);
    setIncludeBasement(true);
    setProjectScope('full_turnkey');
    setActiveTab('wizard');
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="محرك التوليد الزمني الذكي للإنشاءات (Turnkey Construction Schedule Builder)"
      subtitle={projectName ? `المشروع: ${projectName}` : 'توليد مسار إنشائي متكامل (من الحفر والأساسات حتى التشطيب والتسليم) بنقرة زر واحدة'}
      maxWidth="1100px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>
            سيتم إنشاء {previewTasks.length} نشاط ومرحلة تنفيذية مع التواريخ والمسار الحرج CPM.
            {generating && progressCount > 0 && (
              <span style={{ marginInlineStart: '8px', color: '#170e5e', fontWeight: 700 }}>
                (تم إنشاء {progressCount} من {previewTasks.length})
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: 'var(--font-body)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleCommitSchedule}
              disabled={generating}
              style={{
                padding: '8px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#170e5e',
                color: '#ffffff',
                fontSize: 'var(--font-body)',
                fontWeight: 700,
                cursor: generating ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AppIcons.Calendar size={16} />
              <span>{generating ? `جارٍ توليد الجدول (${progressCount}/${previewTasks.length})...` : 'تثبيت واعتماد الجدول الزمني'}</span>
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
        {errorMsg && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 'var(--font-body)', fontWeight: 600 }}>
            {errorMsg}
          </div>
        )}

        {/* Tab Selector */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('wizard')}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeTab === 'wizard' ? '#170e5e' : '#f1f5f9',
              color: activeTab === 'wizard' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: 'var(--font-body)',
              cursor: 'pointer',
            }}
          >
            معالج التوليد السريع للأدوار والمراحل (Wizard)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('excel')}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeTab === 'excel' ? '#170e5e' : '#f1f5f9',
              color: activeTab === 'excel' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: 'var(--font-body)',
              cursor: 'pointer',
            }}
          >
            استيراد من إكسيل (Excel)
          </button>
        </div>

        {activeTab === 'excel' ? (
          <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
            <AppIcons.FileText size={40} style={{ color: '#170e5e', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>
              استيراد بيانات الجدول الزمني من ملف إكسيل
            </h3>
            <p style={{ fontSize: 'var(--font-body)', color: '#64748b', maxWidth: '540px', margin: '0 auto 16px' }}>
              يمكنك استيراد ملف إكسيل للجدول الزمني أو تطبيق القالب الإنشائي الميداني القياسي (حفر وأساسات + هيكل خرساني + تشطيبات متكاملة).
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={handleImportExcelSample}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  fontSize: 'var(--font-body)',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                تطبيق القالب الإنشائي القياسي
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Scope Selection Box */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: 'var(--font-body)', fontWeight: 700, color: '#170e5e' }}>
                نطاق المشروع الإنشائي المطلوب توليده:
              </label>
              <CustomSelect
                options={SCOPE_OPTIONS}
                value={projectScope}
                onChange={(val) => setProjectScope(val as ProjectScope)}
                placeholder="اختر نطاق تنفيذ المشروع..."
              />
            </div>

            {/* Wizard Settings Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  تاريخ بدء أعمال المشروع *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: 'var(--font-body)',
                    fontWeight: 600,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  عدد الأدوار المتكررة
                </label>
                <input
                  type="number"
                  min="1"
                  max="40"
                  value={floorsCount}
                  onChange={(e) => setFloorsCount(parseInt(e.target.value) || 1)}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: 'var(--font-body)',
                    fontWeight: 700,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  مدة خرسانة الدور (أيام)
                </label>
                <input
                  type="number"
                  min="1"
                  value={concreteDaysPerFloor}
                  onChange={(e) => setConcreteDaysPerFloor(parseInt(e.target.value) || 1)}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: 'var(--font-body)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  مدة مباني الدور (أيام)
                </label>
                <input
                  type="number"
                  min="1"
                  value={masonryDaysPerFloor}
                  onChange={(e) => setMasonryDaysPerFloor(parseInt(e.target.value) || 1)}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: 'var(--font-body)',
                  }}
                />
              </div>
            </div>

            {/* Checkboxes for Basement and Roof */}
            <div style={{ display: 'flex', gap: '20px', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-body)', cursor: 'pointer', fontWeight: 600, color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={includeBasement}
                  onChange={(e) => setIncludeBasement(e.target.checked)}
                />
                <span>يشمل دور بدروم</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-body)', cursor: 'pointer', fontWeight: 600, color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={includeRoof}
                  onChange={(e) => setIncludeRoof(e.target.checked)}
                />
                <span>يشمل دور سطح (روف) وغرف خدمات</span>
              </label>
            </div>

            {/* Live Schedule Preview Table */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                  معاينة الجدول الزمني المولد ({previewTasks.length} نشاط ومرحلة)
                </h4>
                <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>
                  تاريخ الانتهاء المتوقع للمشروع: <strong style={{ color: '#170e5e' }}>{previewTasks[previewTasks.length - 1]?.endDate || '-'}</strong>
                </span>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', maxHeight: '340px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '8px 10px', fontSize: 'var(--font-table-head)', color: '#475569', width: '80px', textAlign: 'center' }}>WBS</th>
                      <th style={{ padding: '8px 10px', fontSize: 'var(--font-table-head)', color: '#475569', width: '180px' }}>الحزمة الإنشائية</th>
                      <th style={{ padding: '8px 10px', fontSize: 'var(--font-table-head)', color: '#475569' }}>بيان النشاط والمرحلة</th>
                      <th style={{ padding: '8px 10px', fontSize: 'var(--font-table-head)', color: '#475569', width: '95px', textAlign: 'center' }}>البداية</th>
                      <th style={{ padding: '8px 10px', fontSize: 'var(--font-table-head)', color: '#475569', width: '95px', textAlign: 'center' }}>النهاية</th>
                      <th style={{ padding: '8px 10px', fontSize: 'var(--font-table-head)', color: '#475569', width: '70px', textAlign: 'center' }}>المدة</th>
                      <th style={{ padding: '8px 10px', fontSize: 'var(--font-table-head)', color: '#475569', width: '80px', textAlign: 'center' }}>المسار</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewTasks.map((t, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                        <td style={{ padding: '8px 10px', fontSize: 'var(--font-micro)', fontWeight: 700, color: '#170e5e', textAlign: 'center' }}>
                          {t.wbsCode}
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: 'var(--font-micro)' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                            {t.category}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#1e293b' }}>
                          {t.taskName}
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: 'var(--font-micro)', color: '#64748b', textAlign: 'center' }}>
                          {t.startDate}
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: 'var(--font-micro)', color: '#64748b', textAlign: 'center' }}>
                          {t.endDate}
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#0f172a', textAlign: 'center' }}>
                          {t.durationDays} يوم
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: 'var(--font-micro)', textAlign: 'center' }}>
                          {t.isCriticalPath ? (
                            <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: 700 }}>
                              حرج CPM
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>عادي</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </StandardDialog>
  );
}
