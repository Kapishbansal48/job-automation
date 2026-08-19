import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { CandidateProfile, Job } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: `${BASE_URL}/api` }),
  tagTypes: ["Job", "Candidate", "Batch"],
  endpoints: (builder) => ({
    getJobs: builder.query<{ count: number; jobs: Job[] }, string | void>({
      query: (search) => (search ? `/jobs?search=${encodeURIComponent(search)}` : "/jobs"),
      providesTags: ["Job"],
    }),
    scrapeJobs: builder.mutation<{ message: string; fetched: number; created: number; updated: number }, void>({
      query: () => ({ url: "/jobs/scrape", method: "POST" }),
      invalidatesTags: ["Job"],
    }),
    applyToJob: builder.mutation<{ message: string; jobId: string }, string>({
      query: (jobId) => ({ url: `/applications/${jobId}/apply`, method: "POST" }),
      invalidatesTags: ["Job"],
    }),
    applyToAll: builder.mutation<{ message: string; total: number }, void>({
      query: () => ({ url: "/applications/apply-all", method: "POST" }),
      invalidatesTags: ["Job", "Batch"],
    }),
    getApplyAllStatus: builder.query<
      {
        total: number;
        completed: number;
        running: boolean;
        lastTopUp: { added: number; fetchedTotal: number; at: string } | null;
      },
      void
    >({
      query: () => "/applications/apply-all/status",
      providesTags: ["Batch"],
    }),
    getCandidate: builder.query<CandidateProfile, void>({
      query: () => "/candidate",
      providesTags: ["Candidate"],
    }),
  }),
});

export const {
  useGetJobsQuery,
  useScrapeJobsMutation,
  useApplyToJobMutation,
  useApplyToAllMutation,
  useGetApplyAllStatusQuery,
  useGetCandidateQuery,
} = apiSlice;
