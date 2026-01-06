


const CLICKUP_CONFIG = {
    API_KEY: "pk_3677597_Y9QGK34UCENA4JYMT1MR8RJVCJN0MDMC",
    TEAM_ID: "9009178151",
    SPACE_ID: "90090394573",
    BASE_URL: "https://api.clickup.com/api/v2",
};

async function clickUpFetch(endpoint: string) {
    const response = await fetch(`${CLICKUP_CONFIG.BASE_URL}${endpoint}`, {
        headers: {
            "Authorization": CLICKUP_CONFIG.API_KEY,
            "Content-Type": "application/json",
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ClickUp API Error: ${response.status} - ${errorText}`);
    }
    return response.json();
}

async function debug() {
    const targetEmail = "hamza@getaichatbots.com";
    console.log(`--- Debugging ClickUp for ${targetEmail} ---`);

    try {
        // 1. Get team members
        console.log("Fetching team members...");
        const teamData: any = await clickUpFetch(`/team/${CLICKUP_CONFIG.TEAM_ID}`);
        const members = teamData.team.members;
        console.log(`Found ${members.length} members in team.`);

        const member = members.find((m: any) => m.user.email.toLowerCase() === targetEmail.toLowerCase());
        if (!member) {
            console.log(`❌ User with email ${targetEmail} NOT found in team.`);
            console.log("Member emails found:");
            members.forEach((m: any) => console.log(` - ${m.user.email} (ID: ${m.user.id})`));
            return;
        }

        const clickUpUserId = member.user.id;
        console.log(`✅ Found user: ${member.user.username} (ID: ${clickUpUserId})`);

        // 2. Fetch tasks
        console.log("\nFetching completed tasks...");
        const params = new URLSearchParams();
        params.append("assignees[]", clickUpUserId.toString());
        params.append("include_closed", "true");
        params.append("statuses[]", "complete");
        params.append("space_ids[]", CLICKUP_CONFIG.SPACE_ID);
        // Use a very old date_done_gt to ensure we see historical tasks
        params.append("date_done_gt", "0");

        // Also try without status filter just in case "complete" is not the right status name
        const taskData: any = await clickUpFetch(`/team/${CLICKUP_CONFIG.TEAM_ID}/task?${params.toString()}`);
        console.log(`✅ Found ${taskData.tasks?.length || 0} tasks with 'complete' status.`);

        if (taskData.tasks?.length > 0) {
            console.log("First 3 tasks:");
            taskData.tasks.slice(0, 3).forEach((t: any) => {
                console.log(` - [${t.status.status}] ${t.name} (Done: ${t.date_done ? new Date(parseInt(t.date_done)).toISOString() : "N/A"})`);
            });
        } else {
            console.log("Trying without status filter...");
            const paramsAll = new URLSearchParams();
            paramsAll.append("assignees[]", clickUpUserId.toString());
            paramsAll.append("include_closed", "true");
            paramsAll.append("space_ids[]", CLICKUP_CONFIG.SPACE_ID);
            const allTaskData: any = await clickUpFetch(`/team/${CLICKUP_CONFIG.TEAM_ID}/task?${paramsAll.toString()}`);
            console.log(`✅ Found ${allTaskData.tasks?.length || 0} total tasks (any status).`);
            if (allTaskData.tasks?.length > 0) {
                console.log("Statuses found in these tasks:");
                const statuses = new Set(allTaskData.tasks.map((t: any) => t.status.status));
                console.log(Array.from(statuses));
            }
        }

    } catch (error) {
        console.error("error:", error);
    }
}

debug();
