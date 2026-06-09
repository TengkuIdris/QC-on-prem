const express = require('express');
const cors = require('cors');
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// モックユーザーデータ
const mockUserData = {
  id: 1,
  email: 'test@example.com',
  name: 'テストユーザー',
  company: 'テスト会社',
  department: 'テスト部門',
  plansDetails: [
    {
      action: {
        type: 'READ',
      },
      enableFlag: true
    },
    {
      action: {
        type: 'WRITE',
      },
      enableFlag: true
    }
  ]
};

// ユーザー情報取得API
app.get('/api/v1/user/me', (req, res) => {
  res.json({
    data: mockUserData
  });
});

// その他必要なAPIエンドポイントをここに追加

app.listen(port, () => {
  console.log(`Mock server running at http://localhost:${port}`);
}); 