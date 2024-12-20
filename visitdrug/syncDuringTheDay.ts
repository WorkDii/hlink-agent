import { addSeconds, format } from "date-fns";
import { env } from "../lib/env.ts";
import { directusClient } from "../lib/directus.ts";
import { readItems } from "@directus/sdk";
import { info } from "../lib/log.ts";
import { listJhcisVisitDrugItem } from "./listJhcisVisitDrugItem.ts";
import { insertJhcisVisitdrugItemToDirectus } from "./insertJhcisVisitdrugItemToDirectus.ts";

const DEFAULT_SCHEDULE = "30 * * * *";

async function job() {
  try {
    const getLastHlinkData = await directusClient.request<
      { dateupdate: string }[]
    >(
      readItems("visitdrug", {
        sort: ["-dateupdate"],
        limit: 1,
        fields: ["dateupdate"],
      }),
    );

    let lastDateUpdate = format(new Date(), "yyyy-MM-dd");
    if (getLastHlinkData.length) {
      lastDateUpdate = format(
        addSeconds(getLastHlinkData[0].dateupdate, 1),
        "yyyy-MM-dd HH:mm:ss",
      );
    }
    const visitdrug = await listJhcisVisitDrugItem(lastDateUpdate);
    await insertJhcisVisitdrugItemToDirectus(visitdrug);
    info("[syncDuringTheDay] finish");
  } catch (error) {
    info("[syncDuringTheDay] error sync visitdrug " + JSON.stringify(error));
  }
}

export function triggerSyncDuringTheDay() {
  info("[syncDuringTheDay] start " + new Date());
  const schedule = env.DRUG_SYNC_SCHEDULE || DEFAULT_SCHEDULE;
  job();
  Deno.cron("syncDuringTheDay cronjob", schedule, async () => {
    info(
      `[syncDuringTheDay] running syncDuringTheDay ${schedule} NOW IS ` +
        new Date(),
    );
    try {
      await job();
    } catch (error) {
      info("[syncDuringTheDay] error sync visitdrug " + JSON.stringify(error));
    }
  });
}
