import streamlit as st
import os
import tempfile
from openai import OpenAI
import google.generativeai as genai

# ==========================================
# アプリの設定・UIデザイン
# ==========================================
st.set_page_config(page_title="Tele-Apo Master AI", layout="wide", page_icon="📞")

st.title("📞 テレアポ解析 & 逐語録作成アプリ")

# ==========================================
# サイドバー：APIキー設定
# ==========================================
st.sidebar.header("⚙️ API設定")
openai_api_key = st.sidebar.text_input("OpenAI API Key (Whisper用)", type="password")
google_api_key = st.sidebar.text_input("Google API Key (Gemini用)", type="password")
st.sidebar.info("※ Google API Keyは 'Google AI Studio' から無料で取得可能です。")

# ==========================================
# メイン機能
# ==========================================
col1, col2 = st.columns([1, 2])

with col1:
    st.subheader("📁 音声ファイル入力")
    uploaded_file = st.file_uploader("ドラッグ＆ドロップ (mp3, m4a, wav)", type=["mp3", "m4a", "wav"])
    
    st.subheader("🎯 精度調整 (AmiVoice級)")
    custom_vocab = st.text_area(
        "専門用語・商品名・キーワード",
        value="株式会社〇〇, クラウド・コア, BANT条件, 決裁権, リード獲得, CVR, 相見積もり, 失礼いたします",
        height=100
    )
    
    analysis_prompt = st.selectbox(
        "Geminiへの分析指示",
        ["標準：失注/受注分析", "コーチング：改善点フィードバック", "要約：議事録作成"]
    )

# ==========================================
# 処理ロジック
# ==========================================
if uploaded_file is not None:
    if not openai_api_key or not google_api_key:
        st.error("⚠️ 左のサイドバーで両方のAPIキーを設定してください。")
    else:
        if st.button("🚀 解析スタート", use_container_width=True):
            status_text = st.empty()
            progress_bar = st.progress(0)
            
            try:
                # --- フェーズ1: Whisperによる文字起こし ---
                client = OpenAI(api_key=openai_api_key)
                status_text.text("🎧 Whisper AIが音声を聴いています... (一文一句書き起こし中)")
                progress_bar.progress(30)
                
                with tempfile.NamedTemporaryFile(delete=False, suffix=f".{uploaded_file.name.split('.')[-1]}") as tmp_file:
                    tmp_file.write(uploaded_file.getvalue())
                    tmp_path = tmp_file.name

                with open(tmp_path, "rb") as audio_file:
                    transcript_obj = client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        language="ja",
                        prompt=f"テレアポの逐語録です。以下の用語を正確に記述してください: {custom_vocab}。フィラー（えー、あのー）は残しつつ、正確に書き起こして。",
                        response_format="text"
                    )
                
                transcript_text = transcript_obj
                
                # --- フェーズ2: Geminiによる分析 ---
                progress_bar.progress(60)
                status_text.text("🧠 Gemini Pro 1.5 が分析中... (文脈理解とコーチング)")
                
                genai.configure(api_key=google_api_key)
                model = genai.GenerativeModel('gemini-1.5-pro')
                
                system_instruction = f"""
                あなたはトップセールスのコーチです。以下のテレアポの文字起こしを分析してください。
                【分析モード: {analysis_prompt}】
                文字起こしテキスト: {transcript_text}
                出力フォーマット:
                1. 通話の概要
                2. 顧客の反応レベル (S/A/B/C/D)
                3. 良かった点
                4. 改善点・機会損失 (具体的なトーク例)
                5. ネクストアクション
                """
                
                response = model.generate_content(system_instruction)
                analysis_result = response.text
                
                progress_bar.progress(100)
                status_text.text("✅ 完了しました！")
                os.remove(tmp_path)

                st.divider()
                res_col1, res_col2 = st.columns(2)
                with res_col1:
                    st.header("📝 逐語録 (Whisper)")
                    st.text_area("Transcript", transcript_text, height=600)
                with res_col2:
                    st.header("📊 AIコーチング (Gemini)")
                    st.markdown(analysis_result)

            except Exception as e:
                st.error(f"エラーが発生しました: {e}")