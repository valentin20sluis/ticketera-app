import type { User, UserJSON } from "@clerk/nextjs/server";
import type { ClerkUserInput } from "@/modules/users/services/user-sync.service";

export function fromClerkApiUser(user: User): ClerkUserInput {
  const email = user.primaryEmailAddress?.emailAddress ?? "";
  return {
    clerkUserId: user.id,
    email,
    fullName: user.fullName ?? email,
    publicRole: user.publicMetadata?.role,
  };
}

export function fromWebhookUser(data: UserJSON): ClerkUserInput {
  const email =
    data.email_addresses.find((address: { id: string; email_address: string }) => address.id === data.primary_email_address_id)
      ?.email_address ?? "";
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ");
  return {
    clerkUserId: data.id,
    email,
    fullName: fullName || email,
    publicRole: data.public_metadata?.role,
  };
}
