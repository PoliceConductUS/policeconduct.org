import { withDb } from "#src/lib/db.js";

export type EducationRecord = {
  id: string;
  name: string;
  completionDate: string | null;
  credits: string | null;
  sponsorName: string | null;
  sponsorInstructor: string | null;
};

let educatedPersonnelPromise: Promise<Set<string>> | null = null;

const loadEducatedPersonnelSet = (): Promise<Set<string>> => {
  if (!educatedPersonnelPromise) {
    educatedPersonnelPromise = withDb(async (client) => {
      const { rows } = await client.query<{ personnel_id: string }>(
        `select distinct personnel_id from public.personnel_education`,
      );
      return new Set(rows.map((row) => row.personnel_id));
    });
  }
  return educatedPersonnelPromise;
};

export const loadEducationForPersonnel = async (
  personnelId: string,
): Promise<EducationRecord[]> => {
  if (!(await loadEducatedPersonnelSet()).has(personnelId)) return [];

  return withDb(async (client) => {
    const { rows } = await client.query<{
      id: string;
      name: string;
      completion_date: string | null;
      credits: string | null;
      sponsor_name: string | null;
      sponsor_instructor: string | null;
    }>(
      `select id, name, completion_date::text, credits::text,
         sponsor_name, sponsor_instructor
       from public.personnel_education
       where personnel_id = $1
       order by completion_date desc nulls last, id`,
      [personnelId],
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      completionDate: row.completion_date,
      credits: row.credits,
      sponsorName: row.sponsor_name,
      sponsorInstructor: row.sponsor_instructor,
    }));
  });
};
