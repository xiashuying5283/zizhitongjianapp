import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import volumeRoutes from "./routes/volumes";
import characterRoutes from "./routes/characters";
import readingProgressRoutes from "./routes/reading-progress";
import authRoutes from "./routes/auth";
import fetchTestRoutes from "./routes/fetch-test";
import fetchZizhitongjianRoutes from "./routes/fetch-zizhitongjian";
import paragraphsRoutes from "./routes/paragraphs";
import postsRoutes from "./routes/posts";
import commentsRoutes from "./routes/comments";
import fetchReferenceRoutes from "./routes/fetch-reference";
import feedbackRoutes from "./routes/feedback";
import uploadRoutes from "./routes/upload";
import bookmarksRoutes from "./routes/bookmarks";
import notesRoutes from "./routes/notes";
import readingStatsRoutes from "./routes/reading-stats";
import ttsRoutes from "./routes/tts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 静态文件服务（本地上传的文件）
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check
app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({ status: 'ok' });
});

// Routes
app.use('/api/v1/volumes', volumeRoutes);
app.use('/api/v1/characters', characterRoutes);
app.use('/api/v1/reading-progress', readingProgressRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', fetchTestRoutes);
app.use('/api/v1/fetch-zizhitongjian', fetchZizhitongjianRoutes);
app.use('/api/v1/paragraphs', paragraphsRoutes);
app.use('/api/v1/posts', postsRoutes);
app.use('/api/v1/comments', commentsRoutes);
app.use('/api/v1/fetch-reference', fetchReferenceRoutes);
app.use('/api/v1/feedback', feedbackRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/bookmarks', bookmarksRoutes);
app.use('/api/v1/notes', notesRoutes);
app.use('/api/v1/reading-stats', readingStatsRoutes);
app.use('/api/v1/tts', ttsRoutes);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
