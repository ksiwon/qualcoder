import { useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useStore } from '../store/useStore';
import { downloadXLSX, downloadFullProject, readFileText } from '../utils/tabExchange';

const Bar = styled.div`
  height:var(--header-h); background:var(--surface); border-bottom:1px solid var(--border);
  display:flex; align-items:center; padding:0 12px; gap:6px; flex-shrink:0; z-index:5;
`;
const AppName = styled.div`
  font-size:14px; font-weight:900; color:var(--text); letter-spacing:-0.5px;
  display:flex; align-items:center; gap:6px; margin-right:6px;
  span{color:var(--accent);}
`;
const Pill = styled.div`font-size:9px; font-weight:800; background:var(--accent-light); color:var(--accent); padding:2px 7px; border-radius:99px; border:1px solid #E07B5444;`;
const Spacer = styled.div`flex:1;`;
const Stat = styled.div`
  font-size:11px; color:var(--text-secondary); font-weight:600;
  display:flex; align-items:center; gap:3px; padding:3px 8px;
  border-radius:6px; background:var(--surface2); border:1px solid var(--border);
`;
const Btn = styled.button<{v?:'dark'|'ghost'|'accent'}>`
  padding:5px 11px; border-radius:7px; font-size:11px; font-weight:700;
  background:${p=>p.v==='accent'?'var(--accent)':p.v==='dark'?'#18181B':'var(--surface2)'};
  color:${p=>p.v==='dark'||p.v==='accent'?'white':'var(--text-secondary)'};
  border:1px solid ${p=>p.v==='ghost'?'var(--border)':'transparent'};
  display:flex; align-items:center; gap:4px; white-space:nowrap;
  transition:opacity 0.15s; &:hover{opacity:0.8;}
`;
const SaveDot = styled.span<{dirty:boolean}>`
  font-size:11px; font-weight:700; padding:3px 8px; border-radius:6px;
  background:${p=>p.dirty?'var(--accent-light)':'var(--surface2)'};
  color:${p=>p.dirty?'var(--accent)':'var(--text-muted)'};
  border:1px solid ${p=>p.dirty?'var(--accent)33':'var(--border)'};
`;
const ProjectInput = styled.input`
  font-size:12.5px; font-weight:700; color:var(--text); border:none; outline:none;
  background:transparent; max-width:160px;
  &::placeholder{color:var(--text-muted);}
`;

export const TopBar = () => {
  const {
    documents, quotations, codes, memos,
    isDirty, saveProject, loadProject,
    importProjectData,
    projectName, setProjectName,
    codeGroups
  } = useStore();
  const importRef = useRef<HTMLInputElement>(null);

  // Ctrl+S
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey||e.metaKey) && e.key==='s') { e.preventDefault(); saveProject(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [saveProject]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await readFileText(file);
    const ok = importProjectData(text);
    alert(ok ? '✅ 프로젝트를 불러왔습니다.' : '❌ 파일 형식 오류');
    e.target.value = '';
  };

  return (
    <Bar>
      <AppName><span>Q</span>ualCoder<Pill>BETA</Pill></AppName>
      <ProjectInput
        value={projectName}
        onChange={e => setProjectName(e.target.value)}
        placeholder="프로젝트 이름..."
      />
      <Spacer />
      <Stat>📄{documents.length}</Stat>
      <Stat>🏷️{codes.length}</Stat>
      <Stat>💬{quotations.length}</Stat>
      <Stat>📝{memos.length}</Stat>
      <SaveDot dirty={isDirty}>{isDirty ? '● 미저장' : '✓ 저장됨'}</SaveDot>
      <Btn v="ghost" onClick={saveProject}>💾</Btn>
      <Btn v="ghost" onClick={() => { if (confirm('현재 작업이 사라집니다. 계속?')) { const ok = loadProject(); if (!ok) alert('저장된 프로젝트가 없습니다.'); }}}>📂 열기</Btn>
      <Btn v="ghost" onClick={() => importRef.current?.click()}>📥 가져오기</Btn>
      <Btn v="ghost" onClick={() => downloadFullProject(documents, codes, quotations, codeGroups, memos, projectName)}>📤 내보내기</Btn>
      <Btn v="dark" onClick={() => downloadXLSX(codes, quotations, documents)}>↓ XLSX</Btn>
      <input ref={importRef} type="file" accept=".json,.qualcoder" style={{display:'none'}} onChange={handleImport} />
    </Bar>
  );
};
