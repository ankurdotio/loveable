import { Router } from "express";
import {
  createFiles,
  getFileTree,
  getFiles,
  removeFiles,
  updateFiles,
} from "../controllers/file.controller.js";

const router: Router = Router();

router.get("/file-tree", getFileTree);
router.get("/files", getFiles);
router.post("/files", createFiles);
router.patch("/files", updateFiles);
router.delete("/files", removeFiles);

export default router;
