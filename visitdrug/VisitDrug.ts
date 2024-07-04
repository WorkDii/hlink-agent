import { RowDataPacket } from "mysql2";

export type VisitDrug = RowDataPacket & {
  visitno: number;
  drugcode: string;
  costprice: string;
  realprice: string;
  dateupdate: Date;
  pcucode: string;
  unit: number;
  drugcode24?: string;
  drugtype: string;
};
