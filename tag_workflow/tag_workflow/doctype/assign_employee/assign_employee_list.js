frappe.listview_settings['Assign Employee'] = {
    onload: function(){
            $('.custom-actions.hidden-xs.hidden-md').hide();
			$('[data-original-title="Refresh"]').hide();
			$('.menu-btn-group').hide();
            $("button.btn.btn-primary.btn-sm.primary-action").hide()
            $("button.btn.btn-default.btn-sm.ellipsis").hide()    
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
		},
        job_order(val,f){
            return `<span class="ellipsis" title="" id="${val}-${f.name}" ><a class="ellipsis" href="/app/job-order/${val}" data-fieldname="${val}-${f.name}" >${val}</a></span>`            
		}
	},
    refresh:function(){
        $("button.btn.btn-primary.btn-sm.primary-action").hide()
        $("button.btn.btn-default.btn-sm.ellipsis").hide()
    }
}