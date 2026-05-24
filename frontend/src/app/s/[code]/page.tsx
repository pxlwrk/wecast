/**
 * Short URL redirect page.
 * The actual redirect (301) is handled by the backend.
 * This page is a fallback if JavaScript is disabled.
 */

import { redirect } from "next/navigation";

interface Props {
  params: { code: string };
}

export default async function ShortUrlPage({ params }: Props) {
  // Redirect to API endpoint which issues 301
  redirect(`/api/v1/s/${params.code}`);
}
