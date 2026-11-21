import type { ReactNode } from "react";

/**
 * Official DECODEX rules, shown on the briefing page. Teams must tick the
 * agreement before opening missions. Bump RULES_VERSION when the text changes
 * so every team is asked to agree again.
 */
export const RULES_VERSION = 1;

export const RULES_INTRO =
  "Please read the following rules carefully before attempting the challenges. All participating teams are expected to abide by these rules throughout the competition.";

export const RULES_ACK =
  "By participating in DecodeX, teams acknowledge that they have read and agreed to abide by these rules. The organisers reserve the right to disqualify teams found violating the rules or engaging in unfair practices.";

export const RULES: { title: string; body: ReactNode; note?: string }[] = [
  {
    title: "Qualification for the Final Round",
    body: (
      <p>
        The <strong>top 30 teams</strong> on the final leaderboard will qualify for the offline final round.
      </p>
    ),
  },
  {
    title: "Leaderboard and Rankings",
    body: (
      <p>
        Team rankings will remain hidden during the challenge. The final rankings will be announced{" "}
        <strong>within one hour after the challenge concludes</strong>.
      </p>
    ),
  },
  {
    title: "Sequential Puzzle Progression",
    body: (
      <p>
        Challenges must be solved in the order presented. Teams can proceed to the next puzzle{" "}
        <strong>only after successfully solving the current puzzle</strong>.
      </p>
    ),
  },
  {
    title: "Ranking Criteria",
    body: (
      <>
        <p>Teams will be ranked based on:</p>
        <ul>
          <li>
            <strong>Number of puzzles solved:</strong> Teams that solve more puzzles will receive a higher rank.
          </li>
          <li>
            <strong>Time taken to solve:</strong> In case of a tie in the number of puzzles solved, the team that solves
            them faster will be ranked higher.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "Challenge Access Window and Timer",
    body: (
      <>
        <p>
          Participants may log in and begin attempting the challenges anytime between <strong>10:00 AM and 12:00 PM</strong>.
        </p>
        <p>
          The <strong>two-hour challenge timer will start at 10:00 AM sharp for all teams</strong>, irrespective of when
          they log in. The challenge will conclude at <strong>12:00 PM</strong>. Teams joining late will not receive any
          additional time or extensions and will have less time to complete the challenges.
        </p>
      </>
    ),
  },
  {
    title: "Team Login and Flag Submission Cooldown",
    body: (
      <>
        <p>To ensure fair participation and maintain server stability:</p>
        <ul>
          <li>
            Only <strong>one designated team member (the team lead)</strong> is permitted to log in to the challenge
            platform and submit flags on behalf of the team.
          </li>
          <li>
            An incorrect flag submission will trigger a <strong>15-second cooldown</strong> before the team can submit
            another attempt.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "Verification of Solutions",
    body: (
      <>
        <p>
          The organisers reserve the right to contact any team and request an explanation of their approach or
          methodology for solving a particular puzzle or multiple puzzles.
        </p>
        <p>
          Teams must provide the requested explanation within the stipulated time.{" "}
          <strong>Failure to do so may result in disqualification.</strong>
        </p>
      </>
    ),
  },
  {
    title: "Hints and Organiser Communication",
    body: (
      <>
        <p>
          If hints are made available, they will be published exclusively through the <strong>Hints Log on the challenge
          website</strong>.
        </p>
        <p>
          Participants are expected to check the Hints Log regularly. Directly contacting the organisers to request hints
          is discouraged. Any official hints or clarifications will be communicated through the designated platform.
        </p>
      </>
    ),
    note: "On this site, the Hints Log is the Intel button at the top of the screen.",
  },
  {
    title: "Organisers’ Decision and Queries",
    body: (
      <>
        <p>
          Participants may contact the organisers to raise any concerns, seek clarification, or report issues related to
          the competition. The organisers will review such concerns and provide clarification wherever necessary.
        </p>
        <p>
          However, the final decision of the organisers shall remain final and binding on all matters related to the
          competition, including rules, scoring, rankings, disputes, and disqualification. Participants are expected to
          respect and abide by the organisers’ decisions, and no further appeals against a final decision will be
          entertained.
        </p>
      </>
    ),
  },
];

const key = (teamId: string) => `decodex-ctf-rules-v${RULES_VERSION}-${teamId}`;
// Fallback when the browser blocks storage, so the tick still counts this visit.
const memory = new Set<string>();

/** Whether this team ticked the rules agreement on this device. */
export function hasAgreedToRules(teamId: string): boolean {
  if (memory.has(key(teamId))) return true;
  try {
    return localStorage.getItem(key(teamId)) === "agreed";
  } catch {
    return false;
  }
}

export function setAgreedToRules(teamId: string, agreed: boolean) {
  if (agreed) memory.add(key(teamId));
  else memory.delete(key(teamId));
  try {
    if (agreed) localStorage.setItem(key(teamId), "agreed");
    else localStorage.removeItem(key(teamId));
  } catch {
    /* storage blocked: the tick still works for this visit */
  }
}
