frappe.listview_settings["Contract"] = {
    onload:function(){
        if(frappe.session.user != 'Administrator'){
            $('.custom-actions.hidden-xs.hidden-md').hide()
            $('[data-original-title="Refresh"]').hide()
            $('.menu-btn-group').hide()
        }
    },
    refresh:function(){
        $('[data-original-title = "Name"]>input').attr('placeholder', 'Contract ID');
        $('[data-original-title = "Hiring Company"]>input').attr('placeholder', 'Company Name');
        $('span.level-item:nth-child(3)').html('Contract ID');
        $('.list-header-subject > div:nth-child(4) > span:nth-child(1)').html('Company Name');
    }
}