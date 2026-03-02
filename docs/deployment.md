# デプロイメントガイド - M1 Native Hybrid Scouter

Mac M1 (16GB) を本番AIサーバーとして運用するための Cloudflare Tunnel 接続手順。

## アーキテクチャ概要

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│ Chrome Extension│────▶│ Cloudflare Tunnel    │────▶│ Mac M1 ローカル │
│ (Side Panel)    │     │ (HTTPS エンドポイント)│     │ Python Backend  │
└─────────────────┘     └──────────────────────┘     │ :8765           │
                                                      └─────────────────┘
```

- **Web (Next.js)**: Vercel にデプロイ
- **Chrome Extension**: ローカルビルド or ストア配布
- **Python Backend**: Mac M1 上で常時起動、Cloudflare Tunnel で公開

---

## 1. Cloudflare Tunnel のセットアップ

### 1.1 cloudflared のインストール

```bash
# macOS (Homebrew)
brew install cloudflared

# または公式インストーラー
# https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
```

### 1.2 クイックトンネル（開発・検証用）

```bash
# Python Backend を起動
cd apps/backend-ai
source .venv/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8765

# 別ターミナルでトンネル起動
cloudflared tunnel --url http://127.0.0.1:8765
```

出力例:
```
Your quick Tunnel has been created! Visit it at:
https://xxxx-xx-xx-xx-xx.trycloudflare.com
```

Chrome Extension の「API エンドポイント」にこの URL を設定してください。

### 1.3 名前付きトンネル（本番推奨）

```bash
# Cloudflare にログイン
cloudflared tunnel login

# トンネル作成
cloudflared tunnel create hybrid-scouter

# 設定ファイル作成
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: <TUNNEL_ID>
credentials-file: /Users/<USER>/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: scouter.your-domain.com
    service: http://127.0.0.1:8765
  - service: http_status:404
EOF

# トンネル起動（バックグラウンド）
cloudflared tunnel run hybrid-scouter
```

`scouter.your-domain.com` を Cloudflare DNS で CNAME 設定し、トンネルIDを指すようにします。

---

## 2. Mac M1 を本番サーバーとして運用

### 2.1 必要なサービス

| サービス | ポート | 説明 |
|----------|--------|------|
| Python Backend | 8765 | FastAPI (scout, transcribe) |
| Ollama | 11434 | Gemma 3 等のローカルLLM |
| mlx-whisper | - | Python 内で利用 |

### 2.2 起動スクリプト例

```bash
#!/bin/bash
# ~/start-hybrid-scouter.sh

# Ollama 起動（未起動の場合）
pgrep -x ollama > /dev/null || ollama serve &

# Gemma モデルプル（初回のみ）
ollama pull gemma3:4b

# Python Backend 起動
cd /path/to/rokuon/apps/backend-ai
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8765
```

### 2.3 launchd で常時起動（macOS）

```xml
<!-- ~/Library/LaunchAgents/com.rokuon.hybrid-scouter.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.rokuon.hybrid-scouter</string>
  <key>ProgramArguments</key>
  <array>
    <string>/path/to/rokuon/apps/backend-ai/.venv/bin/uvicorn</string>
    <string>main:app</string>
    <string>--host</string>
    <string>0.0.0.0</string>
    <string>--port</string>
    <string>8765</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/path/to/rokuon/apps/backend-ai</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
```

```bash
launchctl load ~/Library/LaunchAgents/com.rokuon.hybrid-scouter.plist
```

---

## 3. Next.js 側の設定（mlx-whisper 利用時）

Vercel にデプロイする Web アプリから、ローカルの mlx-whisper を直接呼び出すことはできません（ネットワークが分離されているため）。

**運用パターン:**

1. **ローカル開発**: `USE_MLX_WHISPER=true`、`MLX_WHISPER_URL=http://localhost:8765` で Next.js を起動し、Python Backend と同一マシンで動作させる。
2. **Vercel 本番**: `USE_MLX_WHISPER` を未設定のままにし、OpenAI Whisper を使用（従来通り）。
3. **オンプレミス Next.js**: Mac M1 上で Next.js も起動する場合、`MLX_WHISPER_URL=http://127.0.0.1:8765` で mlx-whisper を利用可能。

---

## 4. Chrome Extension のエンドポイント設定

1. 拡張機能の Side Panel を開く
2. 下部の「API エンドポイント」に以下を入力:
   - ローカル: `http://localhost:8765`
   - 本番: `https://xxxx.trycloudflare.com` または `https://scouter.your-domain.com`
3. 「保存」をクリック

---

## 5. トラブルシューティング

| 現象 | 確認事項 |
|------|----------|
| Extension から接続できない | host_permissions にトンネルURLが含まれているか確認。`https://*.trycloudflare.com/*` を manifest に追加 |
| mlx-whisper が動かない | `pip install mlx-whisper`、`ollama pull gemma3:4b` を実行 |
| 30秒以上かかる | Playwright のタイムアウト短縮、Gemma の代わりに gemma3:4b を使用 |

---

## 参考リンク

- [Cloudflare Tunnel ドキュメント](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Ollama](https://ollama.ai/)
- [mlx-whisper](https://github.com/ml-explore/mlx-examples/tree/main/whisper)
