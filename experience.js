const records = window.exhibitionRecords;
const information = document.createElement('div');
information.className = 'art-info';
one('.viewer-bar').after(information);
all('[data-filter]').forEach(button => button.addEventListener('click', () => {
  all('[data-filter]').forEach(item => item.setAttribute('aria-pressed',String(item===button)));
  let visible = 0;
  all('.art-card').forEach(card => {
    card.hidden = button.dataset.filter !== '全部' && card.dataset.theme !== button.dataset.filter;
    if (!card.hidden) visible++;
  });
  one('#count').textContent = visible+' 件作品';
}));
all('.art-card').forEach(button => button.addEventListener('click', () => {
  const art = records.find(item => item.id === +button.dataset.record);
  const current = ++request;
  opener = button;
  one('#viewer-title').textContent = art.author+' · '+art.title;
  information.replaceChildren(document.createTextNode(art.note));
  const source = document.createElement('a');
  source.href = art.url;
  source.textContent = '馆藏出处 · 公共领域 ↗';
  source.target = '_blank';
  source.rel = 'noopener';
  information.append(source);
  viewImage.alt = art.title;
  viewImage.src = art.image+'.webp';
  status.textContent = '正在加载高清图…';
  dialog.showModal();
  changeZoom(0);
  one('#close').focus();
  const hd = new Image();
  hd.onload = () => {
    if(current!==request || !dialog.open) return;
    viewImage.src=hd.src;
    status.textContent='拖动细看 · 滚轮或双指缩放';
  };
  hd.onerror = () => { if(current===request) status.textContent='高清图暂时无法加载，当前显示预览图。'; };
  hd.src=art.image+'.jpg';
}));
all('[data-art]').forEach(button => button.addEventListener('click',()=>information.replaceChildren()));
const paper = one('#ink-paper');
const pad = new SignaturePad(paper,{minWidth:.8,maxWidth:9,penColor:'#29271f',velocityFilterWeight:.65});
let previousWidth = 0;
const resizePaper = () => {
  const width = paper.clientWidth;
  if(!width || width === previousWidth) return;
  const data = pad.toData();
  const ratio = Math.max(1,devicePixelRatio || 1);
  paper.width=width*ratio;
  paper.height=width*ratio;
  paper.getContext('2d').scale(ratio,ratio);
  if(previousWidth) data.forEach(group=>group.points.forEach(point=>{point.x*=width/previousWidth;point.y*=width/previousWidth;}));
  pad.clear();
  pad.fromData(data);
  previousWidth=width;
};
new ResizeObserver(resizePaper).observe(paper);
one('#brush-width').addEventListener('input',event=>{pad.maxWidth=+event.target.value;});
one('#clear-ink').addEventListener('click',()=>{pad.clear();one('#writing-status').textContent='新纸已铺好。';});
one('#undo-ink').addEventListener('click',()=>{const data=pad.toData();data.pop();pad.fromData(data);one('#writing-status').textContent='已撤回上一笔。';});
one('#save-ink').addEventListener('click',()=>{
  if(pad.isEmpty()){one('#writing-status').textContent='先在纸上留下一笔。';return;}
  const output=document.createElement('canvas');
  output.width=paper.width;output.height=paper.height;
  const ctx=output.getContext('2d');
  ctx.fillStyle='#f7f1e2';ctx.fillRect(0,0,output.width,output.height);ctx.drawImage(paper,0,0);
  const link=document.createElement('a');link.href=output.toDataURL();link.download='墨间-我的这一笔.png';link.click();
  one('#writing-status').textContent='已导出这一笔。';
});

