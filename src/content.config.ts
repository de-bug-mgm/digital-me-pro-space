import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';

const resumeCollection = defineCollection({
  loader: file('data/resume.json'),
  schema: z.object({
    basics: z.object({
      name: z.string(),
      title: z.string(),
      shortBio: z.string(),
      links: z.object({
        github: z.string(),
        linkedin: z.string(),
        email: z.string(),
      }),
    }),
    skills: z.object({
      backend: z.array(z.string()),
      frontend: z.array(z.string()),
      devops: z.array(z.string()),
    }),
    experience: z.array(
      z.object({
        company: z.string(),
        role: z.string(),
        period: z.string(),
        highlights: z.array(z.string()),
      })
    ),
    projects: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
        tags: z.array(z.string()),
        link: z.string(),
      })
    ),
  }),
});

export const collections = {
  resume: resumeCollection,
};