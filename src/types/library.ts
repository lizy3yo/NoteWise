// Placeholder type for removed practice tests feature
export type PracticeTestItem = {
  _id: string;
  title: string;
  description?: string;
  subject: string;
  difficulty: string;
  timeLimit: number;
  totalPoints: number;
  topics: string[];
  attempts: number;
  averageScore?: number;
  isPublic: boolean;
  folder?: string;
  isFavorite?: boolean;
  createdAt?: string;
  updatedAt?: string;
};
