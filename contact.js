(() => {
  const form=document.querySelector('#contact-note-form');
  if(!form)return;
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    const fields=new FormData(form),name=fields.get('name').trim(),email=fields.get('email').trim(),message=fields.get('message').trim();
    if(!name||!message){const field=form.elements.namedItem(!name?'name':'message');field.setCustomValidity('Please add a little something here.');field.reportValidity();return;}
    const subject=`A little hello from ${name}`;
    const body=`Hi Vahri,\n\n${message}\n\n${name}\n${email}`;
    const status=form.querySelector('.contact-form-status');
    status.textContent='Opening your email draft… If your email app didn’t open, you can email vhrimlna@gmail.com directly.';status.hidden=false;
    location.href=`mailto:vhrimlna@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
  form.addEventListener('input',event=>{event.target.setCustomValidity?.('');});
  document.querySelector('.contact-resume')?.addEventListener('click',()=>toast('My full résumé is coming soon. In the meantime, say hello!'));
})();
