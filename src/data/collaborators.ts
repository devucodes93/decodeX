export interface Collaborator {
  name: string;
  logo: string;
  /** Short descriptive label shown under the name. */
  role: string;
}

export const COLLABORATORS: Collaborator[] = [
  {
    name: "BMS Institute of Technology and Management",
    logo: "/assets/collaborators/normalized/bms-institute.webp",
    role: "Host institution",
  },
  {
    name: "IEEE BMSIT Student Branch",
    logo: "/assets/collaborators/normalized/ieee-student-branch.webp",
    role: "Student branch",
  },
  {
    name: "IEEE Signal Processing Society (SPS) – Bangalore Chapter",
    logo: "/assets/collaborators/normalized/ieee-sps-bangalore.webp",
    role: "Technical chapter",
  },
  {
    name: "IEEE Bangalore Section",
    logo: "/assets/collaborators/normalized/ieee-bangalore-section.webp",
    role: "IEEE section",
  },
  {
    name: "Institution's Innovation Council (IIC), BMSIT",
    logo: "/assets/collaborators/normalized/iic.webp",
    role: "Innovation council",
  },
];
