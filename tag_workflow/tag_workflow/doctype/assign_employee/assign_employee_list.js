frappe.listview_settings['Assign Employee'] = {
    onload: function(){
        if(frappe.boot.tag.tag_user_info.company_type!='Staffing'){
            $('.page-actions').hide();
        }
        else{
            $('.custom-actions.hidden-xs.hidden-md').hide();
			$('[data-original-title="Refresh"]').hide();
			$('.menu-btn-group').hide();
        }
    },

    formatters: {
		hiring_organization(val,f){
            return `<span class="filterable ellipsis" title="" id="${val}-${f.name}" ><a class="filterable ellipsis" data-fieldname="${val}-${f.name}" onclick = "myfunction('${val}')">${val}</a></span>
            <script>
            function myfunction(name){
                var name1= name.replace(/%/g, ' ');
                localStorage.setItem('company', name1)
                window.location.href= "/app/dynamic_page"
        
            }
            </script>`;
		},
        company(val,f){
            return `<span class="filterable ellipsis" title="" id="${val}-${f.name}" ><a class="filterable ellipsis" data-fieldname="${val}-${f.name}" onclick = "myfunction1('${val}')">${val}</a></span>
            <script>
            function myfunction1(name){
                var name1= name.replace(/%/g, ' ');
                localStorage.setItem('company', name1)
                window.location.href= "/app/dynamic_page"
        
            }
            </script>`;
		}
	}
}