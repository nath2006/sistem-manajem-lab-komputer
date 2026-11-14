import express from "express";

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    code: 200,
    message: "success",
    data: {
      message: "System is healthy!"
    }
  });
});

export default router;
