# Vercel ログ確認コマンド

本番環境（rokuon-ivory.vercel.app）のサーバーエラーをターミナルで確認する方法です。

## 前提

Vercel CLI にログイン済みであること。

```bash
npx vercel login
```

## ログ確認コマンド

```bash
# プロジェクトを指定してログをストリーム表示
npx vercel logs rokuon-ivory.vercel.app

# または、プロジェクトディレクトリで
cd /Users/narikiyotakashi/Desktop/rokuon
npx vercel logs --prod

# 直近のデプロイのログのみ
npx vercel logs --project=rokuon-ivory --prod
```

## オプション

| オプション | 説明 |
|-----------|------|
| `--prod` | 本番環境のログ |
| `--output=raw` | 生ログ形式で出力 |
| `--since=1h` | 直近1時間のログのみ |

## 例

```bash
# 直近のエラーを確認
npx vercel logs rokuon-ivory.vercel.app --prod

# リアルタイムでログを監視（Ctrl+C で終了）
npx vercel logs rokuon-ivory.vercel.app --follow
```
