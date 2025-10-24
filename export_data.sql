-- Export all tables to SQL INSERT statements
\set ON_ERROR_STOP on

-- Generate INSERT statements for all tables in public schema
DO $$
DECLARE
    table_name text;
    query text;
BEGIN
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename != '_prisma_migrations'
        ORDER BY tablename
    LOOP
        RAISE NOTICE 'Exporting table: %', table_name;
        
        -- Generate INSERT statements
        query := format('
            SELECT ''INSERT INTO public.%I ('' || 
                   string_agg(quote_ident(column_name), '','') || 
                   '') VALUES ('' || 
                   string_agg(
                       CASE 
                           WHEN %I IS NULL THEN ''NULL''
                           ELSE quote_literal(%I::text)
                       END, 
                       '',''
                   ) || '');''
            FROM public.%I',
            table_name, table_name, table_name, table_name
        );
        
        -- This won''t work directly in DO block, we need a different approach
    END LOOP;
END $$;
