import express from "express";
import { Req } from "../../types/networkingTypes";
import { getConnection } from "typeorm";

const handleRank = async (req: Req, res: express.Response) => {
  if (!req.session.userId) {
    return res.json({ error: "not authenticated" });
  }

  const userRank = await getConnection().query(
    `select r.id, r.username, r.rank from ( select u.id, u.username, ROW_NUMBER () OVER ( ORDER BY score desc ) as rank from "user" u ) as r where r.id = ${req.session.userId}`
  );

  return res.json(userRank[0]);
};
export default handleRank;
