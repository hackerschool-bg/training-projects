--
-- PostgreSQL database dump
--

-- Dumped from database version 10.4
-- Dumped by pg_dump version 10.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: ekatte; Type: TABLE; Schema: public; Owner: atodorov
--

CREATE TABLE public.ekatte (
    id character(5) NOT NULL,
    province_id character(5),
    name character varying(25) NOT NULL,
    kind character(1) NOT NULL,
    altitude smallint NOT NULL
);


ALTER TABLE public.ekatte OWNER TO atodorov;

--
-- Name: municipalities; Type: TABLE; Schema: public; Owner: atodorov
--

CREATE TABLE public.municipalities (
    id character(3) NOT NULL,
    name character varying(25) NOT NULL
);


ALTER TABLE public.municipalities OWNER TO atodorov;

--
-- Name: provinces; Type: TABLE; Schema: public; Owner: atodorov
--

CREATE TABLE public.provinces (
    id character(5) NOT NULL,
    municipal_id character(3) NOT NULL,
    name character varying(25) NOT NULL
);


ALTER TABLE public.provinces OWNER TO atodorov;

--
-- Name: ekatte ekatte_pkey; Type: CONSTRAINT; Schema: public; Owner: atodorov
--

ALTER TABLE ONLY public.ekatte
    ADD CONSTRAINT ekatte_pkey PRIMARY KEY (id);


--
-- Name: municipalities municipalities_pkey; Type: CONSTRAINT; Schema: public; Owner: atodorov
--

ALTER TABLE ONLY public.municipalities
    ADD CONSTRAINT municipalities_pkey PRIMARY KEY (id);


--
-- Name: provinces provinces_pkey; Type: CONSTRAINT; Schema: public; Owner: atodorov
--

ALTER TABLE ONLY public.provinces
    ADD CONSTRAINT provinces_pkey PRIMARY KEY (id);


--
-- Name: ekatte ekatte_province_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: atodorov
--

ALTER TABLE ONLY public.ekatte
    ADD CONSTRAINT ekatte_province_id_fkey FOREIGN KEY (province_id) REFERENCES public.provinces(id);


--
-- Name: provinces provinces_municipal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: atodorov
--

ALTER TABLE ONLY public.provinces
    ADD CONSTRAINT provinces_municipal_id_fkey FOREIGN KEY (municipal_id) REFERENCES public.municipalities(id);


--
-- PostgreSQL database dump complete
--

