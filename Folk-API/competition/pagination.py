from rest_framework.pagination import PageNumberPagination


class FolkPageNumberPagination(PageNumberPagination):
    """
    Global pagination that is opt-in by query param (`page_size`) unless
    a view sets `pagination_default_page_size`.

    Endpoint-specific limits can be declared on the view with:
    - `pagination_default_page_size`
    - `pagination_max_page_size`
    """

    page_size = None
    page_size_query_param = "page_size"
    max_page_size = 200

    def paginate_queryset(self, queryset, request, view=None):
        self._active_view = view
        return super().paginate_queryset(queryset, request, view=view)

    def _get_view_attr(self, name: str, default=None):
        view = getattr(self, "_active_view", None)
        if view is None:
            return default
        return getattr(view, name, default)

    def get_page_size(self, request):
        default_page_size = self._get_view_attr(
            "pagination_default_page_size", self.page_size
        )
        raw_page_size = request.query_params.get(self.page_size_query_param)

        if raw_page_size in (None, ""):
            return default_page_size

        try:
            requested_page_size = int(raw_page_size)
        except (TypeError, ValueError):
            return default_page_size

        if requested_page_size <= 0:
            return default_page_size

        max_page_size = self._get_view_attr(
            "pagination_max_page_size", self.max_page_size
        )
        if max_page_size:
            return min(requested_page_size, int(max_page_size))

        return requested_page_size
