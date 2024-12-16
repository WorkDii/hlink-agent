import {  createItem, updateItem, readItems} from "@directus/sdk";
import { directusClient } from "../lib/directus.ts";
import { info } from "../lib/log.ts";
import { env } from "../lib/env.ts";
import { listJhcisCDrug } from "./listJhcisCDrug.ts";
import pMap from "p-map";

async function syncCDrug() { 
  const hospitalDrug = await directusClient.request<{drugcode24: string, id: string}[]>(readItems('hospital_drug', {limit: -1}))
  const exitCdrug = (await directusClient.request<{ id: string }[]>(readItems('cdrug', { limit: -1, fields: ['id'] }))).map(i => i.id)
  const jhcisCdrug = await listJhcisCDrug(hospitalDrug.map(d => d.drugcode24));
  await pMap(jhcisCdrug, async (jCdurg) => {
    const id = `${env.PCU_CODE}_${jCdurg.drugcode}`;
    if (exitCdrug.includes(id)) {
      await directusClient.request(updateItem("cdrug", id, {
        ...jCdurg,
        pcucode: env.PCU_CODE
      })); 
    } else {
      await directusClient.request(createItem("cdrug", {
        id,
        ...jCdurg,
        pcucode: env.PCU_CODE
      }));
    } 
  });
}

export function triggerCDrugReSync() {
  info("[rsync] start resync cdrug " + new Date());
  syncCDrug().then(() => {
    console.log("done resync cdrug", new Date().toISOString());
  });
  Deno.cron("resync data cronjob", "40 */6 * * *", async () => {
    try { 
      await syncCDrug();
      info("[rsync] done resync cdrug " + new Date().toISOString());
    } catch (error) {
      info("[rsync] error resync cdrug " + JSON.stringify(error));
    }
  });
}