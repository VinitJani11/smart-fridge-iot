import { Router, type IRouter } from "express";
import healthRouter from "./health";
import fridgeRouter from "./fridge";
import fridgeSimRouter from "./fridge-sim";

const router: IRouter = Router();

router.use(healthRouter);
router.use(fridgeRouter);
router.use(fridgeSimRouter);

export default router;
