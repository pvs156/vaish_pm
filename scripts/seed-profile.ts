/**
 * Seed Vaishnavi's profile into the database.
 * Run with: node --env-file=.env.local --import=tsx scripts/seed-profile.ts
 */

import { upsertProfile } from "../lib/db/queries/profile";

const RESUME_TEXT = `
Vaishnavi Kulkarni
MS Engineering Management, Purdue University — GPA 4.0 (Expected May 2027)

OBJECTIVE
Seeking Product Manager / Program Manager internship roles in tech, fintech, or AI/ML.

EXPERIENCE

Product Manager Consultant — Kuvia AI (Healthcare AI startup)  2023–2024
- Defined product roadmap for AI-powered patient engagement platform
- Led go-to-market strategy for 3 enterprise healthcare clients
- Conducted user research, A/B testing, and feature prioritization using Agile/Scrum
- Built dashboards in PowerBI and SQL for product metrics and KPIs

Lead Software Engineer — Bounteous (CircleBlack, Fintech)  2021–2023
- Led cross-functional squads using Jira, Confluence, and Scrum ceremonies
- Drove stakeholder management with C-suite stakeholders
- Shipped 5 product features using React, TypeScript, Python, AWS
- Performed competitive analysis and requirements gathering

Product Analyst — Red Gold (Fortune 500)  2020–2021
- Analyzed product metrics using Tableau and SQL
- Supported product operations and sprint planning
- Contributed to OKRs and KPI reporting

SKILLS
Product Roadmapping, Feature Prioritization, Go-to-Market, GTM, A/B Testing,
Agile, Scrum, Kanban, JIRA, Confluence, Figma, PowerBI, Power BI, Python, SQL,
AWS, Machine Learning, Stakeholder Management, User Research, Data Analysis,
Analytics, Tableau, React, TypeScript, JavaScript, Docker, Competitive Analysis,
Product Metrics, Requirements Gathering, Market Research, Sprint Planning,
Backlog Grooming, OKRs, KPIs, Product Discovery

EDUCATION
MS Engineering Management — Purdue University, GPA 4.0, Expected May 2027
BS Computer Science — Prior institution

LOCATION
West Lafayette, IN (open to Remote, Hybrid, New York NY, San Francisco CA, Seattle WA, Austin TX)
`.trim();

async function main() {
  console.log("Seeding Vaishnavi's profile...");

  const profile = await upsertProfile({
    resumeText: RESUME_TEXT,
    preferredTitles: [
      "Product Manager",
      "Associate Product Manager",
      "APM",
      "Technical Product Manager",
      "Program Manager",
      "Product Operations Manager",
      "Product Analyst",
    ],
    preferredSkills: [
      "Product Roadmapping",
      "Feature Prioritization",
      "Go-to-Market",
      "A/B Testing",
      "Agile",
      "Scrum",
      "Kanban",
      "JIRA",
      "Confluence",
      "Figma",
      "PowerBI",
      "Python",
      "SQL",
      "AWS",
      "Stakeholder Management",
      "User Research",
      "Data Analysis",
      "Tableau",
      "React",
      "TypeScript",
      "OKRs",
      "KPIs",
      "Competitive Analysis",
      "Market Research",
      "Sprint Planning",
    ],
    preferredLocations: [
      "Remote",
      "New York, NY",
      "San Francisco, CA",
      "Seattle, WA",
      "Austin, TX",
      "West Lafayette, IN",
    ],
    preferredWorkModel: ["remote", "hybrid"],
  });

  console.log("Profile seeded successfully:", profile.id);
  console.log("Titles:", profile.preferredTitles.length);
  console.log("Skills:", profile.preferredSkills.length);
  console.log("Locations:", profile.preferredLocations.join(", "));
  console.log("Work models:", profile.preferredWorkModel.join(", "));
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
