import express from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { demoInsights,setDemoClock } from '../services/demoInsights.js';
const router=express.Router();
router.use(requireAdmin,(req,res,next)=>req.user.demoSession?next():res.status(403).json({message:'此接口仅供演示数据使用'}));
router.get('/insights',(req,res)=>{try{res.json({code:200,data:demoInsights(req.query)});}catch(e){res.status(400).json({message:e.message});}});
router.post('/clock',(req,res)=>{try{res.json({code:200,data:setDemoClock(req.body||{})});}catch(e){res.status(400).json({message:e.message});}});
export default router;
