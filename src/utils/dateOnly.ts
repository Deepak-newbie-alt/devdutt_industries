export const getTodayInIndiaDateString = (): string => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const getPart = (type: string): string => {
        const value = parts.find(part => part.type === type)?.value;

        if (!value) {
            throw new Error(`Missing date component: ${type}`);
        }

        return value;
    };

    return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
};

export const getTodayInIndiaDbDate = (): Date => {
    return new Date(
        `${getTodayInIndiaDateString()}T00:00:00.000Z`
    );
};