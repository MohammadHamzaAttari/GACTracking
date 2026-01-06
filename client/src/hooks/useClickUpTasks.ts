import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

export interface ClickUpTaskStatus {
    status: string;
    id: string;
    color: string;
    type: string;
}

export interface ClickUpTask {
    id: string;
    name: string;
    text_content: string | null;
    description: string | null;
    status: ClickUpTaskStatus;
    orderindex: string;
    date_created: string;
    date_updated: string;
    date_closed: string | null;
    date_done: string | null;
    due_date: string | null;
    start_date: string | null;
    url: string;
    list: { id: string; name: string };
    folder: { id: string; name: string; hidden?: boolean };
    project: { id: string; name: string; hidden?: boolean };
    space: { id: string };
    priority: { id: string; priority: string; color: string } | null;
    tags: Array<{ name: string; tag_bg: string; tag_fg: string }>;
    creator: {
        id: number;
        username: string;
        email: string;
        color: string;
    };
    assignees: Array<{
        id: number;
        username: string;
        email: string;
        color: string;
        initials: string;
    }>;
}

export interface ClickUpTasksResponse {
    tasks: ClickUpTask[];
    clickUpUser?: {
        id: number;
        username: string;
        email: string;
    };
    error?: string;
}

export function useClickUpTasks(month?: string) {
    const { user } = useAuth();

    return useQuery<ClickUpTasksResponse>({
        queryKey: ["/api/clickup/my-tasks", month],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (month) params.append("month", month);

            const res = await fetch(`/api/clickup/my-tasks?${params.toString()}`, {
                credentials: "include",
            });

            if (!res.ok) {
                const error = await res.json();
                return { tasks: [], error: error.error || "Failed to fetch tasks" };
            }

            return res.json();
        },
        enabled: !!user && user.department === "Development",
        staleTime: 5 * 60 * 1000,
        retry: 1,
    });
}