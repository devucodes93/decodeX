export interface Collaborator {
  name: string;
  logo: string;
  /** Short descriptive label shown under the name. */
  role: string;
}

export const COLLABORATORS: Collaborator[] = [
  {
    name: "BMS Institute of Technology and Management",
    logo: "/assets/collaborators/circle/bms-institute.jpg",
    role: "Host institution",
  },
  {
    name: "IEEE BMSIT Student Branch",
    logo: "/assets/collaborators/circle/ieee-student-branch.jpg",
    role: "Student branch",
  },
  {
    name: "IEEE Signal Processing Society (SPS) – Bangalore Chapter",
    logo: "/assets/collaborators/circle/ieee-sps-bangalore.jpg",
    role: "Technical chapter",
  },
  {
    name: "IEEE Bangalore Section",
    logo: "/assets/collaborators/circle/ieee-bangalore-section.jpg",
    role: "IEEE section",
  },
  {
    name: "Institution's Innovation Council (IIC), BMSIT",
    logo: "/assets/collaborators/circle/iic.jpg",
    role: "Innovation council",
  },
];
