// ketika btn menu diklik

const navbarMenu = document.querySelector('.navbar-menu');
document.querySelector('#btn-menu').onclick=() =>{
    navbarMenu.classList.toggle('active');
};

//klik luar menu sidebar untuk menutup sidebar
const btnMenu = document.querySelector('#btn-menu');
document.addEventListener('click', function(e){
    if(!btnMenu.contains(e.target) && !navbarMenu.contains(e.target)){
    navbarMenu.classList.remove('active');
    };
});
