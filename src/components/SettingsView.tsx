import { useState } from 'react';
import styled from 'styled-components';
import { useStore } from '../store/useStore';

const Wrap = styled.div`flex:1; overflow-y:auto; background:var(--bg); padding:32px;`;
const PageTitle = styled.div`font-size:22px; font-weight:900; color:var(--text); margin-bottom:6px;`;
const PageSub = styled.div`font-size:13px; color:var(--text-muted); margin-bottom:32px;`;
const Grid = styled.div`display:grid; grid-template-columns:1fr 1fr; gap:20px; max-width:900px;`;
const Card = styled.div`background:var(--surface); border:1.5px solid var(--border); border-radius:14px; padding:22px; display:flex; flex-direction:column; gap:16px;`;
const CardTitle = styled.div`font-size:13px; font-weight:800; color:var(--text); display:flex; align-items:center; gap:7px;`;
const CardSub = styled.div`font-size:11px; color:var(--text-muted); margin-top:-10px;`;
const Field = styled.div`display:flex; flex-direction:column; gap:5px;`;
const Label = styled.label`font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;`;

const Input = styled.input<{valid?:boolean|null}>`
  padding:9px 12px; border:1.5px solid ${p=>p.valid===true?'#61D9A5':p.valid===false?'#E96472':'var(--border)'};
  border-radius:8px; font-size:13px; outline:none; background:var(--surface2); color:var(--text);
  font-family:monospace; transition:border-color 0.2s;
  &:focus{border-color:var(--accent);}
  &::placeholder{color:var(--text-muted);font-family:inherit;}
`;
const Select = styled.select`
  padding:9px 12px; border:1.5px solid var(--border); border-radius:8px;
  font-size:12.5px; outline:none; background:var(--surface2); color:var(--text); cursor:pointer;
  &:focus{border-color:var(--accent);}
`;
const Toggle = styled.label`
  display:flex; align-items:center; justify-content:space-between;
  padding:10px 12px; background:var(--surface2); border:1px solid var(--border); border-radius:8px;
  cursor:pointer; font-size:12.5px; font-weight:600; color:var(--text);
`;
const ToggleTrack = styled.div<{on:boolean}>`
  width:38px; height:22px; border-radius:99px; background:${p=>p.on?'var(--accent)':'var(--border2)'};
  position:relative; transition:background 0.2s; flex-shrink:0;
  &::after{content:''; position:absolute; left:${p=>p.on?'18px':'3px'}; top:3px;
    width:16px; height:16px; border-radius:50%; background:white; transition:left 0.2s;}
`;
const Btn = styled.button<{variant?:'accent'|'danger'|'ghost'}>`
  padding:9px 18px; border-radius:9px; font-size:12.5px; font-weight:700; border:none;
  background:${p=>p.variant==='accent'?'var(--accent)':p.variant==='danger'?'#DC2626':'var(--surface2)'};
  color:${p=>p.variant==='accent'||p.variant==='danger'?'white':'var(--text-secondary)'};
  cursor:pointer; border:1.5px solid ${p=>p.variant==='ghost'?'var(--border)':'transparent'};
  transition:opacity 0.15s; &:hover{opacity:0.8;}
`;
const StatusMsg = styled.div<{ok:boolean}>`
  font-size:11.5px; font-weight:600; padding:8px 12px; border-radius:7px;
  background:${p=>p.ok?'#EBF9F3':'#FEE2E2'}; color:${p=>p.ok?'#2A9A6E':'#DC2626'};
  border:1px solid ${p=>p.ok?'#61D9A544':'#E9647244'};
`;
const Divider = styled.div`height:1px; background:var(--border); margin:2px 0;`;

const MODELS = [
  { value:'gemini-3.1-flash-lite-preview', label:'gemini-3.1-flash-lite-preview — 빠름 · 최신 (권장)' },
  { value:'gemini-3-flash-preview',        label:'gemini-3-flash-preview — 최고 정확도 · 최신' },
  { value:'gemini-2.0-flash',              label:'gemini-2.0-flash — 안정적' },
  { value:'gemini-1.5-pro',                label:'gemini-1.5-pro — 구형 · 느림' },
];

const CATEGORIES = ['사용자 경험', '의료 및 돌봄', '기술적 상호작용', '기타'];

export const SettingsView = () => {
  const { settings, updateSettings, clearProject, exportProject, documents, codes, quotations, memos } = useStore();
  const [apiStatus, setApiStatus] = useState<boolean|null>(null);
  const [testing, setTesting] = useState(false);
  const [localKey, setLocalKey] = useState(settings.geminiApiKey);

  const handleSaveKey = () => {
    updateSettings({ geminiApiKey: localKey });
    setApiStatus(null);
  };

  const handleTest = async () => {
    if (!localKey) return;
    setTesting(true);
    setApiStatus(null);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${localKey}`);
      setApiStatus(res.ok);
    } catch { setApiStatus(false); }
    setTesting(false);
  };

  const stats = [
    { icon:'📄', label:'문서', count: documents.length },
    { icon:'🏷️', label:'코드', count: codes.length },
    { icon:'💬', label:'Quotation', count: quotations.length },
    { icon:'📝', label:'메모', count: memos.length },
  ];

  return (
    <Wrap>
      <PageTitle>⚙️ 설정</PageTitle>
      <PageSub>API 키, 모델, 프로젝트 설정을 관리합니다. 설정은 브라우저에 자동 저장됩니다.</PageSub>

      <Grid>
        {/* ── AI / API ── */}
        <Card style={{gridColumn:'1/-1'}}>
          <CardTitle>🤖 AI 설정 (Gemini API)</CardTitle>
          <CardSub>전사(STT), AI 코드 추천 등 모든 AI 기능에 공통 사용됩니다</CardSub>
          <Divider />
          <Field>
            <Label>API Key</Label>
            <div style={{display:'flex',gap:8}}>
              <Input
                type="password"
                placeholder="AIza... (Google AI Studio에서 발급)"
                value={localKey}
                valid={apiStatus}
                onChange={e=>setLocalKey(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter') handleSaveKey();}}
                style={{flex:1}}
              />
              <Btn variant="ghost" onClick={handleTest} style={{whiteSpace:'nowrap',fontFamily:'inherit'}}>
                {testing ? '확인 중...' : '연결 테스트'}
              </Btn>
              <Btn variant="accent" onClick={handleSaveKey}>저장</Btn>
            </div>
            {apiStatus===true && <StatusMsg ok={true}>✅ API 키가 유효합니다. AI 기능을 모두 사용할 수 있습니다.</StatusMsg>}
            {apiStatus===false && <StatusMsg ok={false}>❌ 유효하지 않은 API 키입니다. Google AI Studio (aistudio.google.com) 에서 새로 발급하세요.</StatusMsg>}
            <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.6}}>
              🔒 API 키는 이 브라우저에만 저장되며 외부로 전송되지 않습니다.
            </div>
          </Field>
          <Field>
            <Label>기본 모델</Label>
            <Select value={settings.model} onChange={e=>updateSettings({model:e.target.value})}>
              {MODELS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
            </Select>
            <div style={{fontSize:11,color:'var(--text-muted)'}}>
              STT 전사 및 AI 코드 추천에 사용됩니다. 개별 기능에서 재선택 가능합니다.
            </div>
          </Field>
        </Card>

        {/* ── 코딩 설정 ── */}
        <Card>
          <CardTitle>🏷️ 코딩 설정</CardTitle>
          <Field>
            <Label>기본 카테고리</Label>
            <Select value={settings.defaultCategory} onChange={e=>updateSettings({defaultCategory:e.target.value})}>
              {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field>
            <Label>인터뷰어 화자 레이블</Label>
            <Input
              type="text" placeholder="인터뷰어"
              value={settings.interviewerLabel}
              onChange={e=>updateSettings({interviewerLabel:e.target.value})}
              style={{fontFamily:'inherit'}}
            />
            <div style={{fontSize:11,color:'var(--text-muted)'}}>
              CSV 파싱 및 문서 뷰어에서 인터뷰어 구분에 사용됩니다.
            </div>
          </Field>
          <Toggle>
            <span>자동 저장 (변경 시 로컬 저장)</span>
            <input type="checkbox" style={{display:'none'}} checked={settings.autoSave} onChange={e=>updateSettings({autoSave:e.target.checked})} />
            <ToggleTrack on={settings.autoSave} onClick={()=>updateSettings({autoSave:!settings.autoSave})} />
          </Toggle>
        </Card>

        {/* ── 프로젝트 현황 ── */}
        <Card>
          <CardTitle>📊 현재 프로젝트 현황</CardTitle>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {stats.map(s=>(
              <div key={s.label} style={{padding:'14px',background:'var(--surface2)',borderRadius:10,border:'1px solid var(--border)',textAlign:'center'}}>
                <div style={{fontSize:22}}>{s.icon}</div>
                <div style={{fontSize:22,fontWeight:900,color:'var(--text)',lineHeight:1.2}}>{s.count}</div>
                <div style={{fontSize:11,color:'var(--text-muted)',fontWeight:600}}>{s.label}</div>
              </div>
            ))}
          </div>
          <Divider />
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <Btn variant="accent" onClick={()=>exportProject()}>📤 프로젝트 내보내기</Btn>
            <Btn variant="danger" onClick={()=>{if(confirm('모든 데이터가 삭제됩니다. 계속하시겠습니까?')) clearProject();}}>
              🗑 프로젝트 초기화
            </Btn>
          </div>
        </Card>

        {/* ── 단축키 ── */}
        <Card style={{gridColumn:'1/-1'}}>
          <CardTitle>⌨️ 키보드 단축키</CardTitle>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
            {[
              ['Ctrl + S', '프로젝트 저장'],
              ['드래그', '텍스트 선택 → Quotation 생성'],
              ['더블클릭', '코드명 인라인 편집'],
              ['Enter', '코드 추가 / 검색 확인'],
              ['Esc', '팝업 닫기'],
              ['마우스 휠', '네트워크 뷰 줌'],
            ].map(([key, desc])=>(
              <div key={key} style={{padding:'8px 12px',background:'var(--surface2)',borderRadius:8,border:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
                <code style={{fontSize:11,fontWeight:700,background:'var(--text)',color:'white',padding:'2px 7px',borderRadius:5,whiteSpace:'nowrap'}}>{key}</code>
                <span style={{fontSize:11,color:'var(--text-secondary)'}}>{desc}</span>
              </div>
            ))}
          </div>
        </Card>
      </Grid>
    </Wrap>
  );
};
