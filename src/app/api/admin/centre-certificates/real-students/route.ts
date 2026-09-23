import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Fetch real students
    const { data: students, error: stdError } = await supabaseAdmin
      .from('students')
      .select('id, name, register_no, course, section, semester')
      .order('name', { ascending: true })
      .limit(15);

    if (stdError) {
      console.error('Error fetching students:', stdError);
      return NextResponse.json({ success: false, error: stdError.message }, { status: 500 });
    }

    // 2. Fetch real centres
    const { data: centres } = await supabaseAdmin
      .from('centres')
      .select('id, name')
      .limit(10);

    const centreList = (centres && centres.length > 0) ? centres : [
      { name: 'Center for Data Science' },
      { name: 'Centre for AI (Artificial Intelligence)' },
      { name: 'Center for Cloud' },
      { name: 'Centre for Smart Manufacturing' },
      { name: 'Center for Space' }
    ];

    const sampleProjects = [
      'Real-Time Crop Disease Detection using CNN & Edge IoT',
      'Multi-Region Kubernetes Microservices Auto-Healing Mesh',
      'Autonomous AGV for Smart Warehouse Logistics with ROS2 & LiDAR',
      'Quantum Key Distribution Simulation & Cryptographic Protocol',
      'Deep Learning Neural Network Model for Precision Medical Diagnosis',
      'Smart Grid IoT Power Management & Predictive Anomaly Detection',
      'Generative AI Assistant for Technical Documentation & QA Automation'
    ];

    const sampleCourses = [
      { name: 'Deep Learning for Visual Recognition (12-Week Specialization)', provider: 'NPTEL / Swayam (IIT Madras)', score: 'Elite + Silver (84%)' },
      { name: 'AWS Certified Solutions Architect & DevOps Pipeline', provider: 'AWS Academy / Coursera', score: 'Completed with Honors' },
      { name: 'Industrial Robotics & ROS2 Navigation', provider: 'RoboMaster Academy & FESTO', score: 'Grade A+ (92%)' },
      { name: 'Enterprise Microservices & Distributed Systems with Docker/K8s', provider: 'Infosys Springboard', score: 'Distinction (89%)' },
      { name: 'Advanced Machine Learning & Neural Network Specialization', provider: 'DeepLearning.AI / Coursera', score: 'Elite (88%)' }
    ];

    const sampleHackathons = [
      'Smart India Hackathon (SIH 2025) - Grand Finalist',
      'RIT InnoQuest 2026 - 1st Prize & Best Innovation',
      'National AI & Cloud Hackathon 2025 - Top 5 Award',
      'Tamil Nadu Student Innovation Challenge (TNSDC) - Winner',
      'ISRO Space Technology Challenge - Special Commendation',
      'AWS Buildathon 2025 - Regional Finalist'
    ];

    const getCentreCode = (name: string) => {
      const n = (name || '').toLowerCase();
      if (n.includes('cloud')) return 'CC';
      if (n.includes('artificial') || n.includes(' ai') || n.includes('cai')) return 'CAI';
      if (n.includes('data')) return 'CDS';
      if (n.includes('manufacturing') || n.includes('smart')) return 'CSM';
      if (n.includes('space')) return 'CSP';
      if (n.includes('cyber')) return 'CCS';
      if (n.includes('robotics')) return 'CR';
      return 'FTC';
    };

    const realData = (students || []).map((s: any, idx: number) => {
      const centre = centreList[idx % centreList.length];
      const project = sampleProjects[idx % sampleProjects.length];
      const course = sampleCourses[idx % sampleCourses.length];
      const hackathon = sampleHackathons[idx % sampleHackathons.length];

      const c1 = centre;
      const c2 = centreList[(idx + 1) % centreList.length];
      const c3 = centreList[(idx + 2) % centreList.length];

      return {
        id: `SUB-${100 + idx + 1}`,
        studentName: s.name?.toUpperCase() || 'STUDENT NAME',
        regNo: s.register_no || '2117250070100',
        department: s.course || 'B.Tech. Artificial Intelligence and Data Science',
        year: `Semester ${s.semester || '6'} - Sec ${s.section || 'B'}`,
        centreName: centre.name,
        centreCode: getCentreCode(centre.name),
        projectTitle: project,
        projectDesc: `Designed, implemented, and verified capstone project deliverables in ${centre.name}.`,
        projectLink: `https://github.com/rit-${s.register_no?.toLowerCase() || 'student'}/centre-project`,
        courseName: course.name,
        courseProvider: course.provider,
        courseScore: course.score,
        hackathon: hackathon,
        completionDate: '2026-03-15',
        status: idx === 0 ? 'PENDING_CENTRE' : (idx === 1 ? 'PENDING_OVERALL' : 'APPROVED'),
        certificateId: `RIT-FTC-2026-0${840 + idx}`,
        submittedAt: '2026-03-14 10:30 AM',
        centreRemarks: idx > 0 ? 'Verified project repository, course certificate, and hackathon credential.' : '',
        overallRemarks: idx > 1 ? 'Approved by Overall Coordinator.' : '',
        registeredCentres: [
          {
            centreName: c1.name,
            centreCode: getCentreCode(c1.name),
            semester: `Semester ${s.semester || '6'} (Current Track)`,
            slot: 'Slot A (Wed 03:00 PM)',
            projectTitle: project,
            courseName: course.name,
            courseProvider: course.provider,
            courseScore: course.score,
            hackathon: hackathon,
            status: idx > 1 ? 'Verified & Certified' : (idx === 1 ? 'Under Overall Review' : 'Under Technical Review'),
            isPrimary: true
          },
          {
            centreName: c2.name,
            centreCode: getCentreCode(c2.name),
            semester: 'Semester 5 (Completed)',
            slot: 'Slot B (Thu 03:00 PM)',
            projectTitle: sampleProjects[(idx + 2) % sampleProjects.length],
            courseName: sampleCourses[(idx + 1) % sampleCourses.length].name,
            courseProvider: sampleCourses[(idx + 1) % sampleCourses.length].provider,
            courseScore: sampleCourses[(idx + 1) % sampleCourses.length].score,
            hackathon: sampleHackathons[(idx + 1) % sampleHackathons.length],
            status: 'Completed & Certified',
            isPrimary: false
          },
          {
            centreName: c3.name,
            centreCode: getCentreCode(c3.name),
            semester: 'Semester 4 (Foundational)',
            slot: 'Slot A (Mon 03:00 PM)',
            projectTitle: sampleProjects[(idx + 3) % sampleProjects.length],
            courseName: sampleCourses[(idx + 3) % sampleCourses.length].name,
            courseProvider: sampleCourses[(idx + 3) % sampleCourses.length].provider,
            courseScore: sampleCourses[(idx + 3) % sampleCourses.length].score,
            hackathon: sampleHackathons[(idx + 2) % sampleHackathons.length],
            status: 'Completed & Certified',
            isPrimary: false
          }
        ]
      };
    });

    return NextResponse.json({ success: true, count: realData.length, data: realData });
  } catch (err: any) {
    console.error('Error in real-students endpoint:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
